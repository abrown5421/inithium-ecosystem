import type { CapabilityDefinition } from './registry';

const blogManageCommentsCapability: CapabilityDefinition = {
  key: 'blog:manageComments',
  label: 'Moderate Blog Comments',
  description: 'Reply to and delete comments on blog posts.',
  group: 'Content',
  order: 12,
  defaultRoles: ['editor', 'admin'],
};

export default blogManageCommentsCapability;
