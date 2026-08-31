import {
  Timestamp,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  increment,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import {
  createConversationPrivacy,
  createParticipantKey,
  getOtherParticipantId,
  isConversationParticipant,
  type ConversationPrivacy,
} from '../domain/conversation';

export type StoredConversation = {
  id: string;
  participantIds: [string, string];
  participantKey: string;
  privacyByUser: ConversationPrivacy;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  lastMessagePreview: string;
  lastMessageId?: string;
  lastMessageAt: Timestamp | null;
  unreadCountByUser: Record<string, number>;
};

export type StoredMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  createdAt: Timestamp | null;
  type: 'TEXT' | 'IMAGE' | 'VOICE' | 'SHARED_PHONE' | 'SHARED_ADDRESS' | 'QUOTE_PROPOSAL';
  content: string;
  attachmentUrl?: string;
  quoteData?: unknown;
};

function requireDb() {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured.');
  }
  return db;
}

function normalizeConversation(id: string, data: Record<string, unknown>): StoredConversation {
  const participantIds = Array.isArray(data.participantIds)
    ? data.participantIds.filter((value): value is string => typeof value === 'string')
    : [];

  if (participantIds.length !== 2) {
    throw new Error(`Conversation ${id} has an invalid participant list.`);
  }

  return {
    id,
    participantIds: [participantIds[0], participantIds[1]],
    participantKey: typeof data.participantKey === 'string'
      ? data.participantKey
      : createParticipantKey(participantIds),
    privacyByUser: (data.privacyByUser as ConversationPrivacy | undefined)
      ?? createConversationPrivacy(participantIds),
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt : null,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : null,
    lastMessagePreview: typeof data.lastMessagePreview === 'string'
      ? data.lastMessagePreview
      : '',
    lastMessageId: typeof data.lastMessageId === 'string' ? data.lastMessageId : undefined,
    lastMessageAt: data.lastMessageAt instanceof Timestamp ? data.lastMessageAt : null,
    unreadCountByUser: Object.fromEntries(participantIds.map((userId) => [
      userId,
      typeof (data.unreadCountByUser as Record<string, unknown> | undefined)?.[userId] === 'number'
        ? (data.unreadCountByUser as Record<string, number>)[userId]
        : 0,
    ])),
  };
}

export async function getOrCreateConversation(
  currentUserId: string,
  targetUserId: string,
): Promise<string> {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    throw new Error('A conversation requires two distinct users.');
  }

  const firestore = requireDb();
  const participantIds = [currentUserId, targetUserId] as [string, string];
  const participantKey = createParticipantKey(participantIds);
  const conversationRef = doc(firestore, 'conversations', participantKey);

  // Make creation atomic so concurrent clients cannot race on a missing
  // conversation for the same participant pair.
  await runTransaction(firestore, async (transaction) => {
    const existing = await transaction.get(conversationRef);

    if (existing.exists()) {
      const existingParticipantIds = existing.data().participantIds;
      if (!Array.isArray(existingParticipantIds)
        || existingParticipantIds.length !== 2
        || existingParticipantIds.some((value) => typeof value !== 'string')
        || createParticipantKey(existingParticipantIds) !== participantKey) {
        throw new Error('Conversation participant integrity check failed.');
      }
      return;
    }

    transaction.set(conversationRef, {
      participantIds,
      participantKey,
      privacyByUser: createConversationPrivacy(participantIds),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessagePreview: '',
      lastMessageId: null,
      lastMessageAt: null,
      unreadCountByUser: Object.fromEntries(participantIds.map((userId) => [userId, 0])),
    });
  });

  return conversationRef.id;
}

export function subscribeToUserConversations(
  userId: string,
  onData: (conversations: StoredConversation[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const firestore = requireDb();

  return onSnapshot(
    query(
      collection(firestore, 'conversations'),
      where('participantIds', 'array-contains', userId),
      orderBy('updatedAt', 'desc'),
    ),
    (snapshot) => {
      try {
        onData(snapshot.docs.map((item) => normalizeConversation(item.id, item.data())));
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error('Invalid conversation data.'));
      }
    },
    (error) => onError?.(error),
  );
}

export function subscribeToMessages(
  conversationId: string,
  onData: (messages: StoredMessage[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const firestore = requireDb();

  return onSnapshot(
    query(
      collection(firestore, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc'),
    ),
    (snapshot) => {
      onData(snapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          conversationId,
          senderId: String(data.senderId ?? ''),
          senderName: String(data.senderName ?? ''),
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt : null,
          type: data.type,
          content: String(data.content ?? ''),
          attachmentUrl: typeof data.attachmentUrl === 'string' ? data.attachmentUrl : undefined,
          quoteData: data.quoteData,
        } as StoredMessage;
      }));
    },
    (error) => onError?.(error),
  );
}

export async function sendConversationMessage(input: {
  conversationId: string;
  senderId: string;
  senderName: string;
  type: StoredMessage['type'];
  content: string;
  attachmentUrl?: string;
  quoteData?: unknown;
}): Promise<void> {
  const firestore = requireDb();
  const conversationRef = doc(firestore, 'conversations', input.conversationId);
  const conversationSnapshot = await getDoc(conversationRef);

  if (!conversationSnapshot.exists()) {
    throw new Error('Conversation not found.');
  }

  const participantIds = conversationSnapshot.data().participantIds as string[];
  if (!isConversationParticipant(participantIds, input.senderId)) {
    throw new Error('Sender is not a conversation participant.');
  }

  const recipientId = participantIds.find((userId) => userId !== input.senderId);
  if (!recipientId) {
    throw new Error('Conversation recipient could not be resolved.');
  }

  const messageRef = doc(collection(conversationRef, 'messages'));
  const batch = writeBatch(firestore);

  batch.set(messageRef, {
    conversationId: input.conversationId,
    senderId: input.senderId,
    senderName: input.senderName,
    type: input.type,
    content: input.content,
    ...(input.attachmentUrl ? { attachmentUrl: input.attachmentUrl } : {}),
    ...(input.quoteData !== undefined ? { quoteData: input.quoteData } : {}),
    createdAt: serverTimestamp(),
  });

  batch.update(conversationRef, {
    lastMessagePreview: input.content,
    lastMessageId: messageRef.id,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    [`unreadCountByUser.${input.senderId}`]: 0,
    [`unreadCountByUser.${recipientId}`]: increment(1),
  });

  await batch.commit();
}

export async function markConversationAsRead(input: {
  conversationId: string;
  userId: string;
}): Promise<void> {
  const firestore = requireDb();
  const conversationRef = doc(firestore, 'conversations', input.conversationId);
  const snapshot = await getDoc(conversationRef);

  if (!snapshot.exists()) {
    throw new Error('Conversation not found.');
  }

  const participantIds = snapshot.data().participantIds as string[];
  if (!isConversationParticipant(participantIds, input.userId)) {
    throw new Error('User is not a conversation participant.');
  }

  await updateDoc(conversationRef, {
    [`unreadCountByUser.${input.userId}`]: 0,
    updatedAt: serverTimestamp(),
  });
}

export async function updateConversationPrivacy(input: {
  conversationId: string;
  userId: string;
  phoneShared?: boolean;
  addressShared?: boolean;
}): Promise<void> {
  const firestore = requireDb();
  const conversationRef = doc(firestore, 'conversations', input.conversationId);
  const snapshot = await getDoc(conversationRef);

  if (!snapshot.exists()) {
    throw new Error('Conversation not found.');
  }

  const participantIds = snapshot.data().participantIds as string[];
  if (!isConversationParticipant(participantIds, input.userId)) {
    throw new Error('User is not a conversation participant.');
  }

  const updates: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (typeof input.phoneShared === 'boolean') {
    updates[`privacyByUser.${input.userId}.phoneShared`] = input.phoneShared;
  }

  if (typeof input.addressShared === 'boolean') {
    updates[`privacyByUser.${input.userId}.addressShared`] = input.addressShared;
  }

  await updateDoc(conversationRef, updates);
}

export function getOtherConversationParticipant(
  conversation: StoredConversation,
  currentUserId: string,
): string | null {
  return getOtherParticipantId(conversation.participantIds, currentUserId);
}

export async function getSharedConversationContact(input: {
  conversationId: string;
  type: 'phone' | 'address';
  getIdToken: () => Promise<string>;
}): Promise<string | null> {
  const token = await input.getIdToken();
  const response = await fetch(
    `/api/conversations/${encodeURIComponent(input.conversationId)}/shared-contact/${input.type}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    },
  );

  if (response.status === 403 || response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Unable to retrieve shared contact information.');
  }

  const payload = await response.json() as { value?: unknown };
  return typeof payload.value === 'string' && payload.value.trim()
    ? payload.value.trim()
    : null;
}