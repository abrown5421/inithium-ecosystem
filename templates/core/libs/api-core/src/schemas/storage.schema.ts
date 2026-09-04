import { z } from 'zod';

// The uploaded file itself is validated by multer's fileFilter/limits, not Zod - this only
// covers the text fields multer parses alongside it.
export const uploadAssetSchema = z.object({
  altText: z.string().max(500).optional(),
  // Free-form, not a closed enum - see AssetEntity.purpose's own comment. Defaults to 'general'
  // so a caller that forgets to pass it still gets a valid record rather than a validation error.
  purpose: z.string().min(1).default('general'),
});
export type UploadAssetRequestBody = z.infer<typeof uploadAssetSchema>;
