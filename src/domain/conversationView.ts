import type { Conversation } from '../types';
import type { PublicUserProfile } from './publicProfile';
import type { StoredConversation } from '../services/conversationService';

function formatConversationTime(value: StoredConversation['lastMessageAt']): string {
  if (!value?.toDate) return '';
  return value.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Builds the UI conversation projection without depending on the private
 * `/users` collection. Participant identity is supplied through the explicit
 * public profile projection.
 */
export function toConversationView(
  stored: StoredConversation,
  currentUserId: string,
  otherUser?: PublicUserProfile,
): Conversation {
  const otherUserId = stored.participantIds.find(id => id !== currentUserId) || stored.participantIds[0];
  const privacy = stored.privacyByUser || {};
  const firstUserId = stored.participantIds[0];
  const secondUserId = stored.participantIds[1];

  return {
    id: stored.id,
    participantIds: stored.participantIds,
    otherUser: {
      id: otherUserId,
      name: otherUser?.name || 'Usuario CONEXA',
      avatar: otherUser?.avatar || '',
      profession: otherUser?.professionName,
      isIdentityVerified: otherUser?.isIdentityVerified,
      isProfessionalVerified: otherUser?.isProfessionalVerified,
    },
    lastMessage: stored.lastMessagePreview || 'Conversación iniciada',
    lastMessageTime: formatConversationTime(stored.lastMessageAt) || 'Ahora',
    unreadCount: stored.unreadCountByUser[currentUserId] ?? 0,
    sharedPhoneBySender: privacy[firstUserId]?.phoneShared === true,
    sharedPhoneByReceiver: privacy[secondUserId]?.phoneShared === true,
    sharedAddressBySender: privacy[firstUserId]?.addressShared === true,
    sharedAddressByReceiver: privacy[secondUserId]?.addressShared === true,
  };
}
