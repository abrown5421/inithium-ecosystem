export interface AssetEntity {
  id: string;
  publicUrl: string;
  // The S3 object key - needed by the route layer to call deleteObject/getSignedUrl against
  // @inithium/storage, since this DB record (not the key) is the real ownership source of truth.
  providerKey: string;
  // Reserved for a future thumbnail/image-processing pipeline - nothing populates this yet, same
  // "define the seam early" rationale as StorageProvider's own unused getSignedUrl.
  variants?: Record<string, string>;
  altText?: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  createdAt: Date;
}

export type CreateAssetInput = Omit<AssetEntity, 'id' | 'createdAt'>;

export interface AssetRepository {
  create: (input: CreateAssetInput) => Promise<AssetEntity>;
  findById: (id: string) => Promise<AssetEntity | null>;
  delete: (id: string) => Promise<boolean>;
}
