import { UserRepository } from './user.contract';
import { PageRepository } from './page.contract';

export interface DbConfig {
  uri?: string;
  credentials?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface DbProvider {
  name: string;
  connect: (config: DbConfig) => Promise<void>;
  disconnect: () => Promise<void>;
  getUserRepository: () => UserRepository;
  getPageRepository: () => PageRepository;
}