import { z } from 'zod';

export const createFriendRequestSchema = z.object({
  requesteeId: z.string().min(1, 'requesteeId is required'),
});
export type CreateFriendRequestBody = z.infer<typeof createFriendRequestSchema>;
