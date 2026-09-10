import { GalleryRepository } from '../../contracts/gallery-image.contract';
import { createMongoGalleryImageRepository } from './gallery-image.repository';
import { GalleryImageModel } from '../../schemas/gallery-image.schema';
// inithium:anchor:imports
const galleryRepository = createMongoGalleryImageRepository(GalleryImageModel);
// inithium:anchor:repository-instances
  getGalleryRepository: (): GalleryRepository => galleryRepository,
  // inithium:anchor:members
