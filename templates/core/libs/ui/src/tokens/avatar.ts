import type { ColorSpec } from '../contracts/color.contract';

export const AVATAR_SHAPES = ['circle', 'square'] as const;
export type AvatarShape = (typeof AVATAR_SHAPES)[number];

export const AVATAR_VARIANTS = ['initials', 'image', 'dicebear'] as const;
export type AvatarVariant = (typeof AVATAR_VARIANTS)[number];

// bgColor/fontColor reuse ColorSpec (see contracts/color.contract.ts) rather than raw strings,
// the same semantic-token-or-palette-color contract every other colorable prop in this package
// (Box, Text, Button, ...) already uses.
export interface AvatarStyleConfig {
  readonly bgColor?: ColorSpec;
  readonly fontColor?: ColorSpec;
  readonly shape?: AvatarShape;
}

export interface AvatarInitialsSource {
  readonly variant: 'initials';
  readonly name: string;
}

export interface AvatarImageSource {
  readonly variant: 'image';
  readonly url: string;
  readonly alt?: string;
}

// Not wired up to a DiceBear picker/customization flow yet - that's a future feature. This
// shape only needs to be enough for Avatar to render whatever a future picker eventually
// hands it: a DiceBear style slug, a seed, and that style's own optional query params
// (backgroundColor, radius, ...) passed straight through.
export interface AvatarDicebearSource {
  readonly variant: 'dicebear';
  readonly style: string;
  readonly seed: string;
  readonly options?: Record<string, string | number | boolean>;
  readonly alt?: string;
}

export type AvatarSource = AvatarInitialsSource | AvatarImageSource | AvatarDicebearSource;

export const DEFAULT_AVATAR_STYLE: Required<Pick<AvatarStyleConfig, 'bgColor' | 'shape'>> = {
  bgColor: { color: 'primary', intensity: 500 },
  shape: 'circle',
};
