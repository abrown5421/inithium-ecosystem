export interface UserEntity {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  passwordHash: string;
  createdAt: Date;
}

export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName?: string;
  passwordHash: string;
}

export interface UserRepository {
  findById: (id: string) => Promise<UserEntity | null>;
  findByEmail: (email: string) => Promise<UserEntity | null>;
  create: (input: CreateUserInput) => Promise<UserEntity>;
}