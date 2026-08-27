import type { Model } from 'mongoose';
import { CreateUserInput, DEFAULT_AVATAR_CONFIG, UserEntity, UserRepository } from '../../contracts/user.contract';
import { UserDocument } from './models/userModel';

const mapToUserEntity = (doc: UserDocument): UserEntity => ({
  id: doc._id.toString(),
  email: doc.email,
  firstName: doc.firstName,
  lastName: doc.lastName,
  passwordHash: doc.passwordHash,
  role: doc.role,
  avatar: doc.avatar,
  createdAt: doc.createdAt,
});

export const createMongoUserRepository = (model: Model<UserDocument>): UserRepository => ({
  findById: async (id: string): Promise<UserEntity | null> => {
    const user = await model.findById(id).exec();
    return user ? mapToUserEntity(user) : null;
  },
  findByEmail: async (email: string): Promise<UserEntity | null> => {
    const user = await model.findOne({ email }).exec();
    return user ? mapToUserEntity(user) : null;
  },
  create: async (input: CreateUserInput): Promise<UserEntity> => {
    const user = await model.create({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash: input.passwordHash,
      role: input.role ?? 'user',
      avatar: input.avatar ?? DEFAULT_AVATAR_CONFIG,
    });
    return mapToUserEntity(user);
  },
});
