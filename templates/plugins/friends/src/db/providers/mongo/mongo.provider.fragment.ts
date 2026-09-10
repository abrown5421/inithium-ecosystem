import { FriendRepository } from '../../contracts/friend.contract';
import { createMongoFriendRepository } from './friend.repository';
import { FriendModel } from '../../schemas/friend.schema';
// inithium:anchor:imports
const friendRepository = createMongoFriendRepository(FriendModel);
// inithium:anchor:repository-instances
  getFriendRepository: (): FriendRepository => friendRepository,
  // inithium:anchor:members
