import { useState } from 'react';
import { Box, IconButton, Loader, Text, alert, dialog } from '@inithium/ui';
import { useDeleteAssetMutation, useListUserAssetsQuery } from '@inithium/api-client';
import type { AssetDto } from '@inithium/api-client';
import type { ProfileTabDescriptor, ProfileTabProps } from './registry';

const ASSET_PURPOSES = ['avatar', 'banner'];
const ALERT_POSITION = 'bottom-right' as const;

interface AssetLightboxProps {
  readonly assets: readonly AssetDto[];
  readonly initialIndex: number;
}

// Local to this file, same convention as BannerEditDialog's own BannerColorRow - not part of
// this tab's public surface, just the dialog.show() content for viewing one asset at a time.
const AssetLightbox = ({ assets, initialIndex }: AssetLightboxProps) => {
  const [index, setIndex] = useState(initialIndex);
  const asset = assets[index]!;
  const hasMultiple = assets.length > 1;

  const goToPrevious = () => setIndex((current) => (current - 1 + assets.length) % assets.length);
  const goToNext = () => setIndex((current) => (current + 1) % assets.length);

  return (
    <Box flex={{ direction: 'row', align: 'center', justify: 'center', gap: 16 }}>
      {hasMultiple ? <IconButton icon="CaretLeft" label="Previous image" onClick={goToPrevious} /> : null}
      <img src={asset.url} alt={asset.altText ?? ''} className="max-h-[75vh] max-w-full rounded object-contain" />
      {hasMultiple ? <IconButton icon="CaretRight" label="Next image" onClick={goToNext} /> : null}
    </Box>
  );
};

// The profile page's Assets tab - added through the exact same tabs registry every plugin tab
// uses (see registry.ts), shipped by the storage plugin since it has no reason to exist in a
// workspace without it. visibility: 'all' below means this renders for every viewer, owner or
// not - isOwnProfile alone decides whether delete is offered, matching the registry's own
// documented "owner-managed vs read-only" variant-UI pattern.
const AssetsTab = ({ profile, isOwnProfile }: ProfileTabProps) => {
  const { data: assets, isLoading } = useListUserAssetsQuery({ userId: profile.id, purposes: ASSET_PURPOSES });
  const [deleteAsset] = useDeleteAssetMutation();

  const openLightbox = (index: number) => {
    if (!assets) return;
    dialog.show(() => <AssetLightbox assets={assets} initialIndex={index} />, { title: 'Image', width: '75vw' });
  };

  const handleDelete = async (asset: AssetDto) => {
    const confirmed = await dialog.confirm({
      title: 'Delete this image?',
      description: 'This will permanently delete the image from storage. This cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      confirmVariant: { kind: 'filled', color: 'red' },
    });
    if (!confirmed) return;

    try {
      await deleteAsset(asset.id).unwrap();
      alert.success('Image deleted.', { position: ALERT_POSITION });
    } catch {
      alert.danger('Could not delete this image. Please try again.', { position: ALERT_POSITION });
    }
  };

  if (isLoading) {
    return (
      <Box flex={{ justify: 'center', align: 'center' }} padding={{ base: 32 }}>
        <Loader variant="spinner" color={{ color: 'primary', intensity: 500 }} />
      </Box>
    );
  }

  if (!assets || assets.length === 0) {
    return <Text className="text-sm text-surface-600">No images uploaded yet.</Text>;
  }

  return (
    <Box className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {assets.map((asset, index) => (
        <Box key={asset.id} className="relative aspect-square overflow-hidden rounded-md">
          <button type="button" className="block h-full w-full cursor-pointer" onClick={() => openLightbox(index)}>
            <img src={asset.url} alt={asset.altText ?? ''} className="h-full w-full object-cover" />
          </button>
          {isOwnProfile ? (
            <IconButton
              icon="Trash"
              label="Delete image"
              variant={{ kind: 'filled', color: 'surface', intensity: 100 }}
              textColor={{ color: 'red', intensity: 600 }}
              className="absolute right-2 top-2 rounded-full p-1.5"
              onClick={() => void handleDelete(asset)}
            />
          ) : null}
        </Box>
      ))}
    </Box>
  );
};

const assetsTab: ProfileTabDescriptor = {
  id: 'assets',
  label: 'Assets',
  order: 10,
  visibility: 'all',
  Component: AssetsTab,
};

export default assetsTab;
