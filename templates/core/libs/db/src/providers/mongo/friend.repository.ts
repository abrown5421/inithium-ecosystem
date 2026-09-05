import type { Model } from 'mongoose';
import {
  CreateFriendRequestInput,
  FriendEntity,
  FriendRepository,
  FriendStatus,
} from '../../contracts/friend.contract';
import { FriendDocument } from '../../schemas/friend.schema';

const mapToFriendEntity = (doc: FriendDocument): FriendEntity => ({
  id: doc._id.toString(),
  requesterId: doc.requesterId,
  requesteeId: doc.requesteeId,
  status: doc.status,
  requestedAt: doc.requestedAt,
  acceptedAt: doc.acceptedAt,
});

export const createMongoFriendRepository = (model: Model<FriendDocument>): FriendRepository => ({
  findById: async (id: string): Promise<FriendEntity | null> => {
    const friend = await model.findById(id).exec();
    return friend ? mapToFriendEntity(friend) : null;
  },
  findBetweenUsers: async (userIdA: string, userIdB: string): Promise<FriendEntity | null> => {
    const friend = await model
      .findOne({
        $or: [
          { requesterId: userIdA, requesteeId: userIdB },
          { requesterId: userIdB, requesteeId: userIdA },
        ],
      })
      .exec();
    return friend ? mapToFriendEntity(friend) : null;
  },
  create: async (input: CreateFriendRequestInput): Promise<FriendEntity> => {
    const friend = await model.create({ ...input, status: 'sent', requestedAt: new Date() });
    return mapToFriendEntity(friend);
  },
  updateStatus: async (id: string, status: FriendStatus): Promise<FriendEntity | null> => {
    const update: Record<string, unknown> = { status };
    // Only a transition into 'accepted' ever stamps acceptedAt - a plain seen-flip
    // ('sent' -> 'pending') has no reason to touch it.
    if (status === 'accepted') update['acceptedAt'] = new Date();
    const friend = await model.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).exec();
    return friend ? mapToFriendEntity(friend) : null;
  },
  delete: async (id: string): Promise<boolean> => {
    const result = await model.findByIdAndDelete(id).exec();
    return result !== null;
  },
  markIncomingRequestsSeen: async (requesteeId: string): Promise<number> => {
    const result = await model.updateMany({ requesteeId, status: 'sent' }, { $set: { status: 'pending' } }).exec();
    return result.modifiedCount;
  },
  listAcceptedForUser: async (userId: string): Promise<FriendEntity[]> => {
    const friends = await model
      .find({ status: 'accepted', $or: [{ requesterId: userId }, { requesteeId: userId }] })
      .sort({ acceptedAt: -1 })
      .exec();
    return friends.map(mapToFriendEntity);
  },
  listPendingForUser: async (userId: string): Promise<FriendEntity[]> => {
    const friends = await model
      .find({ status: { $in: ['sent', 'pending'] }, $or: [{ requesterId: userId }, { requesteeId: userId }] })
      .sort({ requestedAt: -1 })
      .exec();
    return friends.map(mapToFriendEntity);
  },
  listRelatedUserIds: async (userId: string): Promise<string[]> => {
    const friends = await model.find({ $or: [{ requesterId: userId }, { requesteeId: userId }] }).exec();
    return friends.map((friend) => (friend.requesterId === userId ? friend.requesteeId : friend.requesterId));
  },
});
