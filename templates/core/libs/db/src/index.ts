import { DbProvider, DbConfig } from './contracts/db-provider.contract';
import { mongoProvider } from './providers/mongo/mongo.provider';

let activeProvider: DbProvider = mongoProvider;

export const setDbProvider = (provider: DbProvider): void => {
  activeProvider = provider;
};

export const getDbProvider = (): DbProvider => activeProvider;

export const connectDatabase = async (config: DbConfig): Promise<void> => {
  await activeProvider.connect(config);
  console.log(` Successfully connected using [${activeProvider.name}] Database Provider`);
};

export const disconnectDatabase = async (): Promise<void> => {
  await activeProvider.disconnect();
};

export const getUserRepository = () => activeProvider.getUserRepository();

// Explicit type exports for contracts
export type { DbProvider, DbConfig } from './contracts/db-provider.contract';
export type { UserRepository, UserEntity, CreateUserInput } from './contracts/userRepository';
export { mongoProvider } from './providers/mongo/mongo.provider';