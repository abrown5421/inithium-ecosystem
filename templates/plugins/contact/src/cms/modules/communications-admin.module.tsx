import type { CmsModule } from './registry';
import { CommunicationsAdminModule } from './communications/CommunicationsAdminModule';

const communicationsAdminModule: CmsModule = {
  id: 'communications',
  navLabel: 'Communications',
  icon: 'Envelope',
  order: 27,
  Component: CommunicationsAdminModule,
};

export default communicationsAdminModule;
