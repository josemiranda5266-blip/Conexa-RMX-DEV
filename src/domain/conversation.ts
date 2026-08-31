export type ConversationPrivacy = Record<string, {
  phoneShared: boolean;
  addressShared: boolean;
}>;

export function createParticipantKey(participantIds: readonly string[]): string {
  const uniqueIds = Array.from(new Set(participantIds.filter(Boolean)));
  if (uniqueIds.length !== 2) {
    throw new Error('A conversation requires exactly two distinct participants.');
  }

  return uniqueIds.sort().join('_');
}

export function getOtherParticipantId(
  participantIds: readonly string[],
  currentUserId: string,
): string | null {
  if (!isValidConversationParticipants(participantIds) || !participantIds.includes(currentUserId)) return null;
  return participantIds.find((participantId) => participantId !== currentUserId) ?? null;
}

export function createConversationPrivacy(
  participantIds: readonly string[],
): ConversationPrivacy {
  createParticipantKey(participantIds);
  return Object.fromEntries(
    participantIds.map((participantId) => [
      participantId,
      { phoneShared: false, addressShared: false },
    ]),
  );
}

export function isValidConversationParticipants(
  participantIds: readonly string[],
): participantIds is [string, string] {
  return participantIds.length === 2
    && typeof participantIds[0] === 'string'
    && typeof participantIds[1] === 'string'
    && participantIds[0].trim().length > 0
    && participantIds[1].trim().length > 0
    && participantIds[0] !== participantIds[1];
}

export function isConversationParticipant(
  participantIds: readonly string[],
  userId: string,
): boolean {
  return isValidConversationParticipants(participantIds) && participantIds.includes(userId);
}
