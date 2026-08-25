export interface UserEntity {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  passwordHash: string;
  createdAt: Date;
}

export interface UserRepository {
  findById: (id: string) => Promise<UserEntity | null>;
  findByEmail: (email: string) => Promise<UserEntity | null>;
  create: (data: Omit<UserEntity, 'id' | 'createdAt'>) => Promise<UserEntity>;
}