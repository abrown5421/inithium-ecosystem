import {
  CreateGalleryImageInput,
  FindManyGalleryImagesOptions,
  FindPublishedGalleryImagesOptions,
  UpdateGalleryImageInput,
} from './contracts/gallery-image.contract';
// inithium:anchor:imports
export const getGalleryRepository = () => activeProvider.getGalleryRepository();
export const listGalleryImages = (options: FindManyGalleryImagesOptions) => getGalleryRepository().findMany(options);
export const listPublishedGalleryImages = (options: FindPublishedGalleryImagesOptions) =>
  getGalleryRepository().findPublished(options);
export const getGalleryImageById = (id: string) => getGalleryRepository().findById(id);
export const createGalleryImage = (input: CreateGalleryImageInput) => getGalleryRepository().create(input);
export const updateGalleryImage = (id: string, input: UpdateGalleryImageInput) =>
  getGalleryRepository().update(id, input);
export const deleteGalleryImage = (id: string) => getGalleryRepository().delete(id);

// inithium:anchor:repositories
export { GALLERY_IMAGE_SOURCE_TYPES } from './contracts/gallery-image.contract';
export type {
  GalleryImageEntity,
  CreateGalleryImageInput,
  UpdateGalleryImageInput,
  GalleryImageSourceType,
  GalleryImageSearchField,
  FindManyGalleryImagesOptions,
  FindPublishedGalleryImagesOptions,
  GalleryRepository,
} from './contracts/gallery-image.contract';
// inithium:anchor:type-exports
