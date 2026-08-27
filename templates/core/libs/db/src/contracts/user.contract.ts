export const AVATAR_VARIANTS = ['initials', 'image', 'dicebear'] as const;
export type AvatarVariant = (typeof AVATAR_VARIANTS)[number];

export const AVATAR_SHAPES = ['circle', 'square'] as const;
export type AvatarShape = (typeof AVATAR_SHAPES)[number];

// Deliberately not `@inithium/ui`'s ColorSpec - libs/db must stay ignorant of any frontend
// presentation package. Shaped identically (color/intensity/opacity) so the API layer can pass
// it straight through to a `@inithium/ui` Avatar's styleConfig without translation.
export interface AvatarColor {
  color: string;
  intensity?: number;
  opacity?: number;
}

export interface AvatarStyleConfig {
  bgColor: AvatarColor;
  fontColor?: AvatarColor;
  shape: AvatarShape;
}

export interface AvatarImageConfig {
  url: string;
}

// Not wired up to a picker/upload flow yet - only enough shape for a future customization
// feature to populate (see AvatarDicebearSource in @inithium/ui's tokens/avatar.ts).
export interface AvatarDicebearConfig {
  style: string;
  seed: string;
  options?: Record<string, string>;
}

export interface AvatarConfig {
  variant: AvatarVariant;
  style: AvatarStyleConfig;
  image?: AvatarImageConfig;
  dicebear?: AvatarDicebearConfig;
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  variant: 'initials',
  style: {
    bgColor: { color: 'primary', intensity: 500 },
    shape: 'circle',
  },
};

export interface UserEntity {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  passwordHash: string;
  role: string;
  avatar: AvatarConfig;
  createdAt: Date;
}

export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName?: string;
  passwordHash: string;
  role?: string;
  avatar?: AvatarConfig;
}

export interface UserRepository {
  findById: (id: string) => Promise<UserEntity | null>;
  findByEmail: (email: string) => Promise<UserEntity | null>;
  create: (input: CreateUserInput) => Promise<UserEntity>;
}
