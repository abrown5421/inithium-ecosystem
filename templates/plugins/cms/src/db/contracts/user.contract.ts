import type { PaginatedResult } from './pagination.contract';

export const AVATAR_VARIANTS = ['initials', 'image', 'dicebear'] as const;
export type AvatarVariant = (typeof AVATAR_VARIANTS)[number];

// Fixed, core-owned role vocabulary - a role is a default-capability template, not the
// enforcement unit itself. Plugins may only contribute new capability keys (see
// @inithium/permissions), never new entries here, so this list stays a small, stable mental
// model no matter how many plugins are installed.
export const CORE_ROLES = ['user', 'contributor', 'editor', 'admin'] as const;
export type Role = (typeof CORE_ROLES)[number];

// A user's effective capability set is their role's default bundle (see
// ROLE_CAPABILITY_DEFAULTS in @inithium/permissions) with these explicit per-key
// grants/revokes layered on top - an absent key means "use the role default", `true`/`false`
// force-grants/force-revokes regardless of what the role would otherwise imply.
export type CapabilityOverrides = Record<string, boolean>;

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
  role: Role;
  // The single distinguished account: bypasses every capability check unconditionally and is
  // the only account allowed to edit another user's capabilityOverrides by default. Never
  // settable through CreateUserInput/UpdateUserInput - see transferOwnership below.
  isOwner: boolean;
  capabilityOverrides: CapabilityOverrides;
  avatar: AvatarConfig;
  createdAt: Date;
}

export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName?: string;
  passwordHash: string;
  role?: Role;
  avatar?: AvatarConfig;
}

export interface UpdateUserInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  passwordHash?: string;
  role?: Role;
  // Whole-map replace, matching this repository's existing convention for avatar - callers must
  // submit the full merged override map, never a partial patch.
  capabilityOverrides?: CapabilityOverrides;
  avatar?: AvatarConfig;
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
  countAll: () => Promise<number>;
  // Unsets isOwner on whoever currently holds it, sets it on newOwnerId, returns the updated
  // new-owner entity. Ownership transfer never goes through the generic update() - keeping it a
  // dedicated method means it can never be smuggled through a normal user-edit form.
  transferOwnership: (newOwnerId: string) => Promise<UserEntity>;
}
