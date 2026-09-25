import type { CreatePageInput } from '../contracts/page.contract';

const productsPageSeed: CreatePageInput = {
  slug: 'products',
  title: 'Shop',
  routePattern: '/products',
  isPluginPage: true,
  pluginOrigin: 'ecommerce',
  animation: { enter: 'animate__fadeIn', exit: 'animate__fadeOut', duration: 300, delay: 0 },
  backgroundColor: { color: 'surface', intensity: 100 },
  foregroundColor: { color: 'surface', intensity: 950 },
  access: { isPublic: true, isAnonymousOnly: false, requiredRoles: [] },
  navigation: { locations: ['primary-nav', 'primary-footer'], label: 'Shop', order: 6 },
  layoutTemplate: 'default',
  isPublished: true,
};

export default productsPageSeed;
