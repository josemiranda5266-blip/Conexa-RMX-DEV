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
  if (!participantIds.includes(currentUserId)) return null;
  return participantIds.find((participantId) => participantId !== currentUserId) ?? null;
}

export function createConversationPrivacy(
  participantIds: readonly string[],
): ConversationPrivacy {
  return Object.fromEntries(
    participantIds.map((participantId) => [
      participantId,
      { phoneShared: false, addressShared: false },
    ]),
  );
}

export function isConversationParticipant(
  participantIds: readonly string[],
  userId: string,
): boolean {
  return participantIds.includes(userId);
}
