import { DbProvider, DbConfig } from './contracts/db-provider.contract';
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

export type { DbProvider, DbConfig } from './contracts/db-provider.contract';
export type { UserRepository, UserEntity, CreateUserInput } from './contracts/user.contract';
export { mongoProvider } from './providers/mongo/mongo.provider';