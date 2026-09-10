import { CreateFriendRequestInput, FriendStatus } from './contracts/friend.contract';
// inithium:anchor:imports
export const getFriendRepository = () => activeProvider.getFriendRepository();
export const getFriendById = (id: string) => getFriendRepository().findById(id);
export const findFriendBetweenUsers = (userIdA: string, userIdB: string) =>
  getFriendRepository().findBetweenUsers(userIdA, userIdB);
export const createFriendRequest = (input: CreateFriendRequestInput) => getFriendRepository().create(input);
export const updateFriendStatus = (id: string, status: FriendStatus) =>
  getFriendRepository().updateStatus(id, status);
export const deleteFriend = (id: string) => getFriendRepository().delete(id);
export const markIncomingFriendRequestsSeen = (requesteeId: string) =>
  getFriendRepository().markIncomingRequestsSeen(requesteeId);
export const listAcceptedFriendsForUser = (userId: string) => getFriendRepository().listAcceptedForUser(userId);
export const listPendingFriendsForUser = (userId: string) => getFriendRepository().listPendingForUser(userId);
export const listRelatedFriendUserIds = (userId: string) => getFriendRepository().listRelatedUserIds(userId);

// inithium:anchor:repositories
export type {
  FriendEntity,
  FriendStatus,
  CreateFriendRequestInput,
  FriendRepository,
} from './contracts/friend.contract';
// inithium:anchor:type-exports
