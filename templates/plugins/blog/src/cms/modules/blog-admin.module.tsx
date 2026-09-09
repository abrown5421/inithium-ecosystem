import type { CmsModule } from './registry';
import { BlogAdminModule } from './blog/BlogAdminModule';

const blogAdminModule: CmsModule = {
  id: 'blog',
  navLabel: 'Blog',
  icon: 'Newspaper',
  order: 25,
  requiredCapability: 'blog:manage',
  Component: BlogAdminModule,
};

export default blogAdminModule;
