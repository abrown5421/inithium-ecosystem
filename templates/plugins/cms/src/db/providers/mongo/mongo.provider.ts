import mongoose from 'mongoose';
import { DbProvider, DbConfig } from '../../contracts/db-provider.contract';
import { UserRepository } from '../../contracts/user.contract';
import { PageRepository } from '../../contracts/page.contract';
import { NotificationRepository } from '../../contracts/notification.contract';
import { SettingsRepository } from '../../contracts/settings.contract';
import { createMongoUserRepository } from './user.repository';
import { createMongoPageRepository } from './page.repository';
import { createMongoNotificationRepository } from './notification.repository';
import { createMongoSettingsRepository } from './settings.repository';
import { UserModel } from './models/userModel';
import { PageModel } from '../../schemas/page.schema';
import { NotificationModel } from '../../schemas/notification.schema';
import { SettingsModel } from '../../schemas/settings.schema';

const userRepository = createMongoUserRepository(UserModel);
const pageRepository = createMongoPageRepository(PageModel);
const notificationRepository = createMongoNotificationRepository(NotificationModel);
const settingsRepository = createMongoSettingsRepository(SettingsModel);

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
  getNotificationRepository: (): NotificationRepository => notificationRepository,
  getSettingRepository: (): SettingsRepository => settingsRepository,
};
