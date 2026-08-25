import { createMongoUserRepository } from './providers/mongo/userRepositoryMongo';
import { UserRepository } from './contracts/userRepository';

export * from './contracts/userRepository';
export * from './connection';

export const userRepository: UserRepository = createMongoUserRepository();