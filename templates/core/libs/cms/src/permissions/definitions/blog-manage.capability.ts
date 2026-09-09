import type { CapabilityDefinition } from './registry';

const blogManageCapability: CapabilityDefinition = {
  key: 'blog:manage',
  label: 'Manage Blog Posts',
  description: 'Create, edit, and delete blog posts.',
  group: 'Content',
  order: 11,
  defaultRoles: ['contributor', 'editor', 'admin'],
};

export default blogManageCapability;
