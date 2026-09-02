import type { CreatePageInput } from '../contracts/page.contract';

const blogPageSeed: CreatePageInput = {
  slug: 'blog',
  title: 'Blog',
  routePattern: '/blog',
  isPluginPage: true,
  pluginOrigin: 'blog',
  animation: { enter: 'animate__fadeIn', exit: 'animate__fadeOut', duration: 300, delay: 0 },
  backgroundColor: { color: 'surface', intensity: 100 },
  foregroundColor: { color: 'surface', intensity: 950 },
  access: { isPublic: true, isAnonymousOnly: false, requiredRoles: [] },
  navigation: { locations: ['primary-nav'], label: 'Blog', order: 2 },
  layoutTemplate: 'default',
  isPublished: true,
};

export default blogPageSeed;
