import { UserRepository, UserEntity, CreateUserInput } from '../../contracts/userRepository';
import { UserModel, UserDocument } from './models/userModel';

const mapToUserEntity = (doc: UserDocument): UserEntity => ({
  id: doc._id.toString(),
  email: doc.email,
  firstName: doc.firstName,
  lastName: doc.lastName,
  passwordHash: doc.passwordHash,
  createdAt: doc.createdAt,
});

export const userRepositoryMongo: UserRepository = {
  findById: async (id: string): Promise<UserEntity | null> => {
    const user = await UserModel.findById(id).exec();
    return user ? mapToUserEntity(user) : null;
  },
  findByEmail: async (email: string): Promise<UserEntity | null> => {
    const user = await UserModel.findOne({ email }).exec();
    return user ? mapToUserEntity(user) : null;
  },
  create: async (input: CreateUserInput): Promise<UserEntity> => {
    const user = await UserModel.create({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash: input.passwordHash,
    });
    return mapToUserEntity(user);
  },
};