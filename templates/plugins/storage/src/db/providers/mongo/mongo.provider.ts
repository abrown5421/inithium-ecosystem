import mongoose from 'mongoose';
import { DbProvider, DbConfig } from '../../contracts/db-provider.contract';
import { UserRepository } from '../../contracts/user.contract';
import { PageRepository } from '../../contracts/page.contract';
import { NotificationRepository } from '../../contracts/notification.contract';
import { SettingsRepository } from '../../contracts/settings.contract';
import { BlogRepository } from '../../contracts/blog.contract';
import { AssetRepository } from '../../contracts/asset.contract';
import { createMongoUserRepository } from './user.repository';
import { createMongoPageRepository } from './page.repository';
import { createMongoNotificationRepository } from './notification.repository';
import { createMongoSettingsRepository } from './settings.repository';
import { createMongoBlogPostRepository } from './blog-post.repository';
import { createMongoAssetRepository } from './asset.repository';
import { UserModel } from './models/userModel';
import { PageModel } from '../../schemas/page.schema';
import { NotificationModel } from '../../schemas/notification.schema';
import { SettingsModel } from '../../schemas/settings.schema';
import { BlogPostModel } from '../../schemas/blog-post.schema';
import { AssetModel } from '../../schemas/asset.schema';

const userRepository = createMongoUserRepository(UserModel);
const pageRepository = createMongoPageRepository(PageModel);
const notificationRepository = createMongoNotificationRepository(NotificationModel);
const settingsRepository = createMongoSettingsRepository(SettingsModel);
const blogRepository = createMongoBlogPostRepository(BlogPostModel);
const assetRepository = createMongoAssetRepository(AssetModel);

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
  getBlogRepository: (): BlogRepository => blogRepository,
  getAssetRepository: (): AssetRepository => assetRepository,
};
