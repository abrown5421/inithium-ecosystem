import { UserRepository, UserEntity } from '../../contracts/userRepository';
import { UserModel } from './models/userModel';

export const createMongoUserRepository = (): UserRepository => ({
  findById: async (id) => {
    const doc = await UserModel.findById(id).lean();
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      email: doc.email,
      firstName: doc.firstName,
      lastName: doc.lastName,
      passwordHash: doc.passwordHash,
      createdAt: doc.createdAt,
    };
  },

  findByEmail: async (email) => {
    const doc = await UserModel.findOne({ email }).lean();
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      email: doc.email,
      firstName: doc.firstName,
      lastName: doc.lastName,
      passwordHash: doc.passwordHash,
      createdAt: doc.createdAt,
    };
  },

  create: async (data) => {
    const doc = await UserModel.create(data);
    return {
      id: doc._id.toString(),
      email: doc.email,
      firstName: doc.firstName,
      lastName: doc.lastName,
      passwordHash: doc.passwordHash,
      createdAt: doc.createdAt,
    };
  },
});