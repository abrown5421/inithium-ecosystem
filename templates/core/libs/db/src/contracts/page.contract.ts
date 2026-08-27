export const NAV_LOCATIONS = ['primary-nav', 'profile-nav', 'primary-footer', 'secondary-footer', 'none'] as const;
export type NavLocation = (typeof NAV_LOCATIONS)[number];

export const PAGE_LAYOUT_TEMPLATES = ['default', 'full-width', 'sidebar-left', 'sidebar-right'] as const;
export type PageLayoutTemplate = (typeof PAGE_LAYOUT_TEMPLATES)[number];

export interface PageAnimationConfig {
  enter: string;
  exit: string;
  duration: number;
  delay: number;
}

export interface PageAccessConfig {
  isPublic: boolean;
  isAnonymousOnly: boolean;
  requiredRoles: string[];
}

export interface PageNavigationConfig {
  location: NavLocation;
  label: string;
  order: number;
  icon?: string;
}

export interface PageSeoConfig {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
}

export interface PageEntity {
  id: string;
  slug: string;
  title: string;
  routePattern: string;
  isPluginPage: boolean;
  pluginOrigin?: string;
  animation: PageAnimationConfig;
  backgroundColor: string;
  foregroundColor: string;
  access: PageAccessConfig;
  navigation: PageNavigationConfig;
  seo?: PageSeoConfig;
  layoutTemplate: PageLayoutTemplate;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CreatePageInput = Omit<PageEntity, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdatePageInput = Partial<CreatePageInput>;

export interface PageRepository {
  findByRoutePattern: (routePattern: string) => Promise<PageEntity | null>;
  findByNavLocation: (location: NavLocation) => Promise<PageEntity[]>;
  findPublished: () => Promise<PageEntity[]>;
  create: (input: CreatePageInput) => Promise<PageEntity>;
  update: (id: string, input: UpdatePageInput) => Promise<PageEntity | null>;
}
