import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { NextFunction, Request, Response, Router as RouterType } from 'express';
import multer from 'multer';
import {
  asyncHandler,
  createSuccessResponse,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@inithium/api-utils';
import { optionalAuth, requireAuth } from '@inithium/auth';
import { createAsset, deleteAsset, getAssetById, getUserRepository, listAssetsForUser, updateUser } from '@inithium/db';
import { deleteObject, uploadObject } from '@inithium/storage';
import { uploadAssetSchema } from '../schemas/storage.schema';

const router: RouterType = Router();

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
// No image/svg+xml - an uploaded SVG can carry <script> and is a stored-XSS vector once rendered
// as/inlined via <img>. Image-only allowlist matches this pass's only 3 consumers (avatar,
// banner, blog post image).
const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const normalizeParam = (raw: string | string[]): string => (Array.isArray(raw) ? raw[0] : raw);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, callback) => {
    if (!(file.mimetype in EXTENSION_BY_MIME_TYPE)) {
      callback(new Error(`Unsupported file type: ${file.mimetype}`));
      return;
    }
    callback(null, true);
  },
});

// multer's own errors (and fileFilter rejections) don't compose with the shared errorHandler on
// their own - it only special-cases `instanceof AppError` - so this adapts them into a clean
// ValidationError before calling next(), rather than mounting multer directly as route middleware.
const handleUpload = (req: Request, res: Response, next: NextFunction): void => {
  upload.single('file')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      next(ValidationError(err.code === 'LIMIT_FILE_SIZE' ? 'File too large. Max size is 5MB.' : err.message));
      return;
    }
    if (err) {
      next(ValidationError(err instanceof Error ? err.message : 'Invalid file upload'));
      return;
    }
    next();
  });
};

// Any signed-in user may upload - access to the *specific* features that reach this generic
// endpoint (e.g. blog's create-post form) is already role-gated by that feature itself, and
// self-service avatar/banner upload needs to work for every user, not just staff.
router.post(
  '/api/storage/upload',
  requireAuth,
  handleUpload,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw ValidationError('No file was uploaded');
    }
    const parsed = uploadAssetSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ValidationError('Invalid request body', parsed.error.flatten());
    }

    const extension = EXTENSION_BY_MIME_TYPE[req.file.mimetype] ?? 'bin';
    // Namespaced by uploader for bucket-console readability only - the Asset row's uploadedBy
    // field, not this key, is the real ownership source of truth.
    const key = `uploads/${req.user!.sub}/${randomUUID()}.${extension}`;

    const { publicUrl } = await uploadObject({
      key,
      body: req.file.buffer,
      contentType: req.file.mimetype,
    });

    const asset = await createAsset({
      publicUrl,
      providerKey: key,
      altText: parsed.data.altText,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      uploadedBy: req.user!.sub,
      purpose: parsed.data.purpose,
    });

    res.status(201).json(createSuccessResponse({ url: asset.publicUrl, assetId: asset.id }));
  }),
);

// Public-readable, matching GET /api/profile/:id's own optionalAuth precedent - a profile's
// Assets tab is visible to owned and unowned viewers alike (see ProfileTabDescriptor's
// 'all'-visibility case), so listing the images behind it can't require login either.
router.get(
  '/api/storage/assets',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = typeof req.query['userId'] === 'string' ? req.query['userId'] : undefined;
    if (!userId) {
      throw ValidationError('userId query parameter is required');
    }
    const rawPurpose = req.query['purpose'];
    const purposes = typeof rawPurpose === 'string' && rawPurpose.length > 0 ? rawPurpose.split(',') : undefined;

    const assets = await listAssetsForUser(userId, { purposes });
    res.status(200).json(
      createSuccessResponse(
        assets.map((asset) => ({
          id: asset.id,
          url: asset.publicUrl,
          purpose: asset.purpose,
          altText: asset.altText,
          mimeType: asset.mimeType,
          sizeBytes: asset.sizeBytes,
          createdAt: asset.createdAt,
        })),
      ),
    );
  }),
);

router.delete(
  '/api/storage/assets/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const id = normalizeParam(req.params.id);
    const asset = await getAssetById(id);
    if (!asset) {
      throw NotFoundError('Asset not found');
    }

    // Ownership-scoped, with a staff override - matches notification.contract.ts's
    // deleteForUser precedent (a caller can never delete another user's asset by guessing an id),
    // with admin/editor able to clean up assets attached to content they didn't personally
    // upload, mirroring DELETE /api/blog/:id's own requireRole('admin', 'editor') gate.
    const isOwner = asset.uploadedBy === req.user!.sub;
    const isStaff = req.user!.role === 'admin' || req.user!.role === 'editor';
    if (!isOwner && !isStaff) {
      throw ForbiddenError('You do not have permission to delete this asset');
    }

    // If this asset is still the uploader's active avatar/banner image, clear that reference
    // first - otherwise their profile would keep pointing at a URL that's about to 404, instead
    // of falling back to its generated look the way it already does for a never-set imageUrl.
    //
    // Deliberately reconstructs each config from only its own declared fields rather than
    // `{...uploader.avatar}` / `{...uploader.profileBanner}` minus imageUrl - a spread can carry
    // forward whatever the Mongoose document actually returned (a single-nested subdocument path
    // like profileBanner gets its own auto _id unless the schema opts out), silently corrupting
    // what gets $set back. Building the object field-by-field against the AvatarConfig /
    // UserProfileBannerConfig contracts is provably clean regardless of what Mongoose's internal
    // shape happens to be.
    const uploader = await getUserRepository().findById(asset.uploadedBy);
    if (uploader) {
      if (uploader.avatar.imageUrl === asset.publicUrl) {
        await updateUser(uploader.id, {
          avatar: {
            variant: uploader.avatar.variant,
            style: uploader.avatar.style,
            ...(uploader.avatar.dicebear ? { dicebear: uploader.avatar.dicebear } : {}),
          },
        });
      }
      if (uploader.profileBanner?.imageUrl === asset.publicUrl) {
        await updateUser(uploader.id, {
          profileBanner: {
            cellSize: uploader.profileBanner.cellSize,
            variance: uploader.profileBanner.variance,
            xColors: uploader.profileBanner.xColors,
            yColors: uploader.profileBanner.yColors,
          },
        });
      }
    }

    await deleteObject(asset.providerKey);
    await deleteAsset(id);
    res.status(204).send();
  }),
);

export default router;
