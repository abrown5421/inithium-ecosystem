import type { CmsModule } from './registry';
import { PagesModule } from './pages/PagesModule';

const pagesModule: CmsModule = {
  id: 'pages',
  navLabel: 'Pages',
  icon: 'FileText',
  order: 20,
  Component: PagesModule,
};

export default pagesModule;
