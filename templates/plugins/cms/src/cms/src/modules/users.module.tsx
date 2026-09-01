import type { CmsModule } from './registry';
import { UsersModule } from './users/UsersModule';

const usersModule: CmsModule = {
  id: 'users',
  navLabel: 'Users',
  icon: 'Users',
  order: 10,
  Component: UsersModule,
};

export default usersModule;
