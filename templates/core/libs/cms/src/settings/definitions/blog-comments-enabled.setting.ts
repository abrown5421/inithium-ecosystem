import type { SettingDefinition } from './registry';

const blogCommentsEnabledSetting: SettingDefinition = {
  key: 'blog.commentsEnabled',
  label: 'Enable Comments',
  description: 'Allow visitors to comment on blog posts.',
  group: 'Blog',
  order: 0,
  type: 'boolean',
  default: true,
};

export default blogCommentsEnabledSetting;
