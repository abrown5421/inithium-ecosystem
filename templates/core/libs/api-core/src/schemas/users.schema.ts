import { z } from 'zod';

// Password has no Mongoose-side default (it's hashed in the route before ever reaching the
// repository), so unlike page.schema.ts's role/avatar-style fields there's no `.partial()`
// default-reinjection gotcha to guard against here - it's simply optional on update because a
// blank password field means "leave the current password unchanged."
const userShape = {
  email: z.email(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.string().min(1).optional(),
};

export const createUserSchema = z.object(userShape);
export type CreateUserRequestBody = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object(userShape).partial();
export type UpdateUserRequestBody = z.infer<typeof updateUserSchema>;
