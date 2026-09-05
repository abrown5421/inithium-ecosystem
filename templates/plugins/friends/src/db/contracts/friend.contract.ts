export type FriendStatus = 'sent' | 'pending' | 'accepted';

// 'sent': just created, not yet seen by the requestee. 'pending': the requestee has viewed the
// request (via the notification center - see @inithium/notifications' 'friend:request-received'
// type and friends.route.ts's /requests/seen endpoint) and it now awaits their decision.
// 'accepted' is terminal. There is deliberately no 'declined' status - a decline, a rescind, and
// an unfriend all just delete the row (see friends.route.ts's DELETE /requests/:id), so the same
// pair can always re-request each other later with no cooldown ("infinite denials").
export interface FriendEntity {
  id: string;
  requesterId: string;
  requesteeId: string;
  status: FriendStatus;
  requestedAt: Date;
  acceptedAt?: Date;
}

export type CreateFriendRequestInput = {
  requesterId: string;
  requesteeId: string;
};

export interface FriendRepository {
  findById: (id: string) => Promise<FriendEntity | null>;
  // Direction-agnostic - a relationship row between two users is unique regardless of who
  // requested whom, so callers never need to try both orderings themselves.
  findBetweenUsers: (userIdA: string, userIdB: string) => Promise<FriendEntity | null>;
  create: (input: CreateFriendRequestInput) => Promise<FriendEntity>;
  // Used both for accepting ('accepted') and for the seen-flip's single-row equivalent - kept
  // generic rather than a dedicated `accept` method since both are just a status transition.
  updateStatus: (id: string, status: FriendStatus) => Promise<FriendEntity | null>;
  delete: (id: string) => Promise<boolean>;
  // Bulk 'sent' -> 'pending' for every row where this user is the requestee - see
  // friends.route.ts's PATCH /requests/seen for why this is bulk rather than per-row.
  markIncomingRequestsSeen: (requesteeId: string) => Promise<number>;
  listAcceptedForUser: (userId: string) => Promise<FriendEntity[]>;
  // status in ['sent', 'pending'], either direction - the route layer splits by direction
  // relative to the caller (incoming vs outgoing) since that's a viewer-relative concept, not
  // a stored fact.
  listPendingForUser: (userId: string) => Promise<FriendEntity[]>;
  // Every other-user id this user has ANY row with (any status) - powers the "Add Friends"
  // candidate list's exclusion set.
  listRelatedUserIds: (userId: string) => Promise<string[]>;
}
