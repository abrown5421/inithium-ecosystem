import type { ComponentType } from 'react';
import type { IconName } from '@inithium/ui';

export interface CmsModule {
  readonly id: string;
  readonly navLabel: string;
  readonly icon: IconName;
  readonly order?: number;
  readonly Component: ComponentType;
}

// Every plugin extending the CMS (a future blog plugin, etc.) drops its own uniquely-named
// *.module.tsx file here, default-exporting a CmsModule descriptor - this glob auto-discovers
// all of them at build time, so extending the CMS never requires editing a shared file.
const moduleFiles = import.meta.glob<CmsModule>('./*.module.tsx', { eager: true, import: 'default' });

export const cmsModules: CmsModule[] = Object.values(moduleFiles).sort(
  (a, b) => (a.order ?? 0) - (b.order ?? 0),
);
