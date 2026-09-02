import type { CreatePageInput } from '../contracts/page.contract';

// Not linked from any nav location - reached by clicking a card on the blog index, not a nav
// link (mirrors home/docs/login/signup's own use of `locations` for the same reason).
const blogPostPageSeed: CreatePageInput = {
  slug: 'blog-post',
  title: 'Blog Post',
  routePattern: '/blog/:id',
  isPluginPage: true,
  pluginOrigin: 'blog',
  animation: { enter: 'animate__fadeIn', exit: 'animate__fadeOut', duration: 300, delay: 0 },
  backgroundColor: { color: 'surface', intensity: 100 },
  foregroundColor: { color: 'surface', intensity: 950 },
  access: { isPublic: true, isAnonymousOnly: false, requiredRoles: [] },
  navigation: { locations: [], label: 'Blog Post', order: 0 },
  layoutTemplate: 'default',
  isPublished: true,
};

export default blogPostPageSeed;
