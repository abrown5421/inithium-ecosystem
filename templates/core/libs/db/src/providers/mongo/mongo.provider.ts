import mongoose from 'mongoose';
import { DbProvider, DbConfig } from '../../contracts/db-provider.contract';
import { UserRepository } from '../../contracts/user.contract';
import { PageRepository } from '../../contracts/page.contract';
import { createMongoUserRepository } from './user.repository';
import { createMongoPageRepository } from './page.repository';
import { UserModel } from './models/userModel';
import { PageModel } from '../../schemas/page.schema';

const userRepository = createMongoUserRepository(UserModel);
const pageRepository = createMongoPageRepository(PageModel);

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
  getUserRepository: (): UserRepository => userRepository,
  getPageRepository: (): PageRepository => pageRepository,
};