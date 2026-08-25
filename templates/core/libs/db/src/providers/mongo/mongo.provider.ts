import mongoose from 'mongoose';
import { DbProvider, DbConfig } from '../../contracts/db-provider.contract';
import { UserRepository } from '../../contracts/userRepository';
import { userRepositoryMongo } from './userRepositoryMongo';

export const mongoProvider: DbProvider = {
  name: 'MongoDB',
  connect: async (config: DbConfig) => {
    if (!config.uri) {
      throw new Error('MongoDB URI is required in DbConfig');
    }
    if (mongoose.connection.readyState >= 1) {
      return;
    }
    await mongoose.connect(config.uri);
  },
  disconnect: async () => {
    await mongoose.disconnect();
  },
  getUserRepository: (): UserRepository => userRepositoryMongo,
};