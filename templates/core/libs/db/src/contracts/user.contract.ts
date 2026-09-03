import type { PaginatedResult } from './pagination.contract';

export const AVATAR_VARIANTS = ['initials', 'dicebear'] as const;
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

export interface AvatarDicebearConfig {
  style: string;
  seed: string;
  options?: Record<string, string>;
}

export interface AvatarConfig {
  variant: AvatarVariant;
  style: AvatarStyleConfig;
  dicebear?: AvatarDicebearConfig;
  // Takes precedence over `variant`/`style`/`dicebear` entirely when set - an uploaded/external
  // profile picture always wins over whatever initials or dicebear config is also stored,
  // mirroring UserProfileBannerConfig's own imageUrl override below and Banner's existing
  // imageUrl-over-trianglifyConfig precedence at the @inithium/ui layer.
  imageUrl?: string;
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  variant: 'initials',
  style: {
    bgColor: { color: 'primary', intensity: 500 },
    shape: 'circle',
  },
};

// Deliberately not `@inithium/ui`'s BannerTrianglifyConfig - libs/db must stay ignorant of any
// frontend presentation package (see the same rule on AvatarColor above). Shaped identically so
// the API layer can pass it straight through to a `@inithium/ui` Banner's trianglifyConfig
// without translation.
export interface UserProfileBannerConfig {
  cellSize: number;
  variance: number;
  xColors: string[];
  yColors: string[];
  // Takes precedence over the generated trianglify mesh entirely when set - see the identical
  // override on AvatarConfig above.
  imageUrl?: string;
}

export interface UserEntity {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  passwordHash: string;
  role: string;
  avatar: AvatarConfig;
  profileBanner?: UserProfileBannerConfig;
  createdAt: Date;
}

export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName?: string;
  passwordHash: string;
  role?: string;
  avatar?: AvatarConfig;
  profileBanner?: UserProfileBannerConfig;
}

export interface UpdateUserInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  passwordHash?: string;
  role?: string;
  avatar?: AvatarConfig;
  profileBanner?: UserProfileBannerConfig;
}

export type UserSearchField = 'firstName' | 'lastName' | 'email';

export interface FindManyUsersOptions {
  page: number;
  pageSize: number;
  search?: string;
  searchField?: UserSearchField;
}

export interface UserRegistrationCount {
  date: string;
  count: number;
}

export interface UserRepository {
  findById: (id: string) => Promise<UserEntity | null>;
  findByEmail: (email: string) => Promise<UserEntity | null>;
  findMany: (options: FindManyUsersOptions) => Promise<PaginatedResult<UserEntity>>;
  create: (input: CreateUserInput) => Promise<UserEntity>;
  update: (id: string, input: UpdateUserInput) => Promise<UserEntity | null>;
  delete: (id: string) => Promise<boolean>;
  countRegistrationsByDay: () => Promise<UserRegistrationCount[]>;
}
