import { z } from 'zod';

// The uploaded file itself is validated by multer's fileFilter/limits, not Zod - this only
// covers the text fields multer parses alongside it.
export const uploadAssetSchema = z.object({
  altText: z.string().max(500).optional(),
});
export type UploadAssetRequestBody = z.infer<typeof uploadAssetSchema>;
