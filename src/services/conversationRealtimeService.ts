import type { Message, Conversation } from '../types';
import { toConversationView } from '../domain/conversationView';
import {
  subscribeToMessages,
  subscribeToUserConversations,
  type StoredConversation,
  type Unsubscribe,
} from './conversationService';
import { subscribeToConversationParticipantProfiles } from './conversationParticipantProfileService';

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
  let profileUnsubscribe: Unsubscribe = () => {};
  const messageUnsubscribers = new Map<string, Unsubscribe>();
  const messages: Record<string, Message[]> = {};

  const publish = (profiles: ReadonlyMap<string, Parameters<typeof toConversationView>[2]>) => {
    const conversations = storedConversations.map((stored) =>
      toConversationView(
        stored,
        userId,
        profiles.get(stored.participantIds.find((id) => id !== userId) || stored.participantIds[0]),
      ),
    );

    onState({ conversations, messages: { ...messages } });
  };

  const refreshProfiles = () => {
    const participantIds = Array.from(
      new Set(storedConversations.flatMap((conversation) => conversation.participantIds)),
    );

    profileUnsubscribe();
    profileUnsubscribe = subscribeToConversationParticipantProfiles(
      participantIds,
      (profiles) => publish(profiles),
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
            refreshProfiles();
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
    },
    onError,
  );

  return () => {
    unsubscribeConversations();
    profileUnsubscribe();
    messageUnsubscribers.forEach((unsubscribe) => unsubscribe());
    messageUnsubscribers.clear();
  };
}
