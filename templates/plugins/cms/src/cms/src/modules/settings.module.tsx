import type { CmsModule } from './registry';
import { SettingsModule } from './settings/SettingsModule';

const settingsModule: CmsModule = {
  id: 'settings',
  navLabel: 'Settings',
  icon: 'Gear',
  order: 30,
  Component: SettingsModule,
};

export default settingsModule;
