import type { Message, Conversation } from '../types';
import { toConversationView } from '../domain/conversationView';
import {
  subscribeToMessages,
  subscribeToUserConversations,
  type StoredConversation,
  type Unsubscribe,
} from './conversationService';
import { subscribeToConversationParticipantProfiles } from './conversationParticipantProfileService';
import type { PublicUserProfile } from '../domain/publicProfile';

export interface ConversationRealtimeState {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
}

/**
 * Owns the production realtime graph for messaging:
 * conversations -> participant public profiles -> UI conversation views.
 * Message listeners are attached only through the explicit conversation service.
 */
export function subscribeToConversationRealtime(
  userId: string,
  onState: (state: ConversationRealtimeState) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  let storedConversations: StoredConversation[] = [];
  let participantProfiles = new Map<string, PublicUserProfile>();
  let profileUnsubscribe: Unsubscribe = () => {};
  let subscribedParticipantKey = '';
  const messageUnsubscribers = new Map<string, Unsubscribe>();
  const messages: Record<string, Message[]> = {};

  const publish = () => {
    const conversations = storedConversations.map((stored) =>
      toConversationView(
        stored,
        userId,
        participantProfiles.get(
          stored.participantIds.find((id) => id !== userId) || stored.participantIds[0],
        ),
      ),
    );

    onState({ conversations, messages: { ...messages } });
  };

  const refreshProfiles = () => {
    const participantIds = Array.from(
      new Set(storedConversations.flatMap((conversation) => conversation.participantIds)),
    ).sort();
    const nextParticipantKey = participantIds.join('|');

    // Conversation metadata changes frequently (for example on every new message).
    // Keep the profile listener stable unless the actual participant set changes.
    if (nextParticipantKey === subscribedParticipantKey) return;

    profileUnsubscribe();
    participantProfiles = new Map();
    subscribedParticipantKey = nextParticipantKey;

    if (participantIds.length === 0) {
      publish();
      return;
    }

    profileUnsubscribe = subscribeToConversationParticipantProfiles(
      participantIds,
      (profiles) => {
        participantProfiles = new Map(profiles);
        publish();
      },
      onError,
    );
  };

  const syncMessages = (conversationIds: string[]) => {
    const nextIds = new Set(conversationIds);

    for (const [conversationId, unsubscribe] of messageUnsubscribers) {
      if (nextIds.has(conversationId)) continue;
      unsubscribe();
      messageUnsubscribers.delete(conversationId);
      delete messages[conversationId];
    }

    conversationIds.forEach((conversationId) => {
      if (messageUnsubscribers.has(conversationId)) return;

      messageUnsubscribers.set(
        conversationId,
        subscribeToMessages(
          conversationId,
          (nextMessages) => {
            messages[conversationId] = nextMessages.map((message) => ({
              id: message.id,
              conversationId: message.conversationId,
              senderId: message.senderId,
              senderName: message.senderName,
              createdAt: message.createdAt?.toDate().toISOString() || new Date(0).toISOString(),
              type: message.type,
              content: message.content,
              ...(message.attachmentUrl ? { attachmentUrl: message.attachmentUrl } : {}),
              ...(message.quoteData ? { quoteData: message.quoteData as Message['quoteData'] } : {}),
            }));
            publish();
          },
          onError,
        ),
      );
    });
  };

  const unsubscribeConversations = subscribeToUserConversations(
    userId,
    (nextConversations) => {
      storedConversations = nextConversations;
      syncMessages(nextConversations.map((conversation) => conversation.id));
      refreshProfiles();
      publish();
    },
    onError,
  );

  return () => {
    unsubscribeConversations();
    profileUnsubscribe();
    subscribedParticipantKey = '';
    messageUnsubscribers.forEach((unsubscribe) => unsubscribe());
    messageUnsubscribers.clear();
  };
}
