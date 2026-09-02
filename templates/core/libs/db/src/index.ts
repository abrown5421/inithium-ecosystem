import { DbProvider, DbConfig } from './contracts/db-provider.contract';
import { CreatePageInput, FindManyPagesOptions, NavLocation, UpdatePageInput } from './contracts/page.contract';
import { CreateUserInput, FindManyUsersOptions, UpdateUserInput } from './contracts/user.contract';
import { UpsertSettingInput } from './contracts/settings.contract';
import {
  AddCommentInput,
  CreateBlogPostInput,
  FindManyBlogPostsOptions,
  UpdateBlogPostInput,
} from './contracts/blog.contract';
import { activeProvider as defaultProvider } from './providers/active-provider';

let activeProvider: DbProvider = defaultProvider;

export const setDbProvider = (provider: DbProvider): void => {
  activeProvider = provider;
};

export const getDbProvider = (): DbProvider => activeProvider;

export const connectDatabase = async (config: DbConfig): Promise<void> => {
  await activeProvider.connect(config);
  console.log(`Successfully connected using [${activeProvider.name}] Database Provider`);
};

export const disconnectDatabase = async (): Promise<void> => {
  await activeProvider.disconnect();
};

export const getUserRepository = () => activeProvider.getUserRepository();
export const listUsers = (options: FindManyUsersOptions) => getUserRepository().findMany(options);
export const createUser = (input: CreateUserInput) => getUserRepository().create(input);
export const updateUser = (id: string, input: UpdateUserInput) => getUserRepository().update(id, input);
export const deleteUser = (id: string) => getUserRepository().delete(id);
export const getUserRegistrationsByDay = () => getUserRepository().countRegistrationsByDay();

export const getPageRepository = () => activeProvider.getPageRepository();
export const findPageByRoutePattern = (routePattern: string) =>
  getPageRepository().findByRoutePattern(routePattern);
export const findPageBySlug = (slug: string) => getPageRepository().findBySlug(slug);
export const findPagesByNavLocation = (location: NavLocation) =>
  getPageRepository().findByNavLocation(location);
export const findPublishedPages = () => getPageRepository().findPublished();
export const listPages = (options: FindManyPagesOptions) => getPageRepository().findMany(options);
export const createPage = (input: CreatePageInput) => getPageRepository().create(input);
export const updatePage = (id: string, input: UpdatePageInput) => getPageRepository().update(id, input);

export const getNotificationRepository = () => activeProvider.getNotificationRepository();
export const listNotificationsForUser = (userId: string, options?: { limit?: number }) =>
  getNotificationRepository().listForUser(userId, options);
export const countUnreadNotificationsForUser = (userId: string) =>
  getNotificationRepository().countUnreadForUser(userId);
export const markNotificationAsRead = (id: string, userId: string) =>
  getNotificationRepository().markAsRead(id, userId);
export const markAllNotificationsAsReadForUser = (userId: string) =>
  getNotificationRepository().markAllAsReadForUser(userId);
export const deleteNotificationForUser = (id: string, userId: string) =>
  getNotificationRepository().deleteForUser(id, userId);

export const getSettingsRepository = () => activeProvider.getSettingRepository();
export const listSettings = () => getSettingsRepository().findAll();
// Returns null when nothing has been saved for this key yet - callers fall back to their own
// default, the same merge logic the CMS Settings module itself uses against its definitions.
export const getSetting = (key: string) => getSettingsRepository().findByKey(key);
export const upsertSetting = (input: UpsertSettingInput) => getSettingsRepository().upsert(input);

export const getBlogRepository = () => activeProvider.getBlogRepository();
export const listBlogPosts = (options: FindManyBlogPostsOptions) => getBlogRepository().findMany(options);
export const getBlogPostById = (id: string) => getBlogRepository().findById(id);
export const createBlogPost = (input: CreateBlogPostInput) => getBlogRepository().create(input);
export const updateBlogPost = (id: string, input: UpdateBlogPostInput) => getBlogRepository().update(id, input);
export const deleteBlogPost = (id: string) => getBlogRepository().delete(id);
export const addCommentToBlogPost = (postId: string, input: AddCommentInput) =>
  getBlogRepository().addComment(postId, input);
export const replyToBlogPostComment = (postId: string, commentId: string, reply: string) =>
  getBlogRepository().replyToComment(postId, commentId, reply);
export const deleteBlogPostComment = (postId: string, commentId: string) =>
  getBlogRepository().deleteComment(postId, commentId);
export const listBlogCategories = () => getBlogRepository().findDistinctCategories();
export const listBlogAuthors = () => getBlogRepository().findDistinctAuthors();

export type { DbProvider, DbConfig } from './contracts/db-provider.contract';
export type { PaginatedResult } from './contracts/pagination.contract';
export type {
  UserRepository,
  UserEntity,
  CreateUserInput,
  UpdateUserInput,
  UserSearchField,
  FindManyUsersOptions,
  UserRegistrationCount,
} from './contracts/user.contract';
export { AVATAR_VARIANTS, AVATAR_SHAPES, DEFAULT_AVATAR_CONFIG } from './contracts/user.contract';
export type {
  AvatarVariant,
  AvatarShape,
  AvatarColor,
  AvatarStyleConfig,
  AvatarImageConfig,
  AvatarDicebearConfig,
  AvatarConfig,
} from './contracts/user.contract';
export { NAV_LOCATIONS, PAGE_LAYOUT_TEMPLATES } from './contracts/page.contract';
export type {
  PageEntity,
  CreatePageInput,
  UpdatePageInput,
  PageRepository,
  PageAccessConfig,
  PageAnimationConfig,
  PageColorConfig,
  PageNavigationConfig,
  PageSeoConfig,
  NavLocation,
  PageLayoutTemplate,
  PageSearchField,
  FindManyPagesOptions,
} from './contracts/page.contract';
export type { NotificationEntity, CreateNotificationInput, NotificationRepository } from './contracts/notification.contract';
export { SETTING_TYPES } from './contracts/settings.contract';
export type { SettingType, SettingEntity, UpsertSettingInput, SettingsRepository } from './contracts/settings.contract';
export type {
  BlogPostEntity,
  CommentEntity,
  CreateBlogPostInput,
  UpdateBlogPostInput,
  AddCommentInput,
  BlogPostSearchField,
  FindManyBlogPostsOptions,
  BlogRepository,
} from './contracts/blog.contract';
export { generateExcerptFromHtml } from './utils/generateExcerptFromHtml';
export { ensureSeededPages } from './page-seeds/ensureSeededPages';
export { mongoProvider } from './providers/mongo/mongo.provider';
