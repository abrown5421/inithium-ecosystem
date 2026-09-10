import { CreateAssetInput, ListAssetsForUserOptions } from './contracts/asset.contract';
// inithium:anchor:imports
export const getAssetRepository = () => activeProvider.getAssetRepository();
export const createAsset = (input: CreateAssetInput) => getAssetRepository().create(input);
export const getAssetById = (id: string) => getAssetRepository().findById(id);
export const deleteAsset = (id: string) => getAssetRepository().delete(id);
export const listAssetsForUser = (userId: string, options?: ListAssetsForUserOptions) =>
  getAssetRepository().listForUser(userId, options);

// inithium:anchor:repositories
export type { AssetEntity, CreateAssetInput, AssetRepository, ListAssetsForUserOptions } from './contracts/asset.contract';
// inithium:anchor:type-exports
