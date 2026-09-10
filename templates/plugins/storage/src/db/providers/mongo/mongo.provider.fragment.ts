import { AssetRepository } from '../../contracts/asset.contract';
import { createMongoAssetRepository } from './asset.repository';
import { AssetModel } from '../../schemas/asset.schema';
// inithium:anchor:imports
const assetRepository = createMongoAssetRepository(AssetModel);
// inithium:anchor:repository-instances
  getAssetRepository: (): AssetRepository => assetRepository,
  // inithium:anchor:members
