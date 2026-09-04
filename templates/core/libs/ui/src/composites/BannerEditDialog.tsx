import { useCallback, useEffect, useRef, useState } from 'react';
import type { UserProfileBannerConfig } from '@inithium/db';
import { useUploadAssetMutation } from '@inithium/api-client';
import { AutoIncrementingList } from './AutoIncrementingList';
import { ColorPicker } from './ColorPicker';
import { MediaField } from './MediaField';
import type { MediaFieldHandle } from './MediaField';
import { useElementSize } from './useElementSize';
import { Banner, Box, Button, Slider, Text } from '../components';
import { alert } from '../alert/alert';
import { DEFAULT_BANNER_HEIGHT, DEFAULT_MESH_WIDTH } from '../tokens/banner';

export interface BannerEditDialogProps {
  readonly initialBanner: UserProfileBannerConfig;
  readonly onSave: (banner: UserProfileBannerConfig) => Promise<void>;
  readonly onClose: () => void;
}

const MIN_CELL_SIZE = 10;
const MAX_CELL_SIZE = 100;
const MIN_VARIANCE = 0.1;
const MAX_VARIANCE = 0.9;
const PREVIEW_HEIGHT = 140;
const FALLBACK_COLOR_HEX = '#94a3b8';
const ALERT_POSITION = 'bottom-right' as const;
const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
// The real, live-page banner's ratio (DEFAULT_MESH_WIDTH x DEFAULT_BANNER_HEIGHT) - not this
// dialog's own smaller PREVIEW_HEIGHT, which is just a convenience preview size unrelated to how
// the saved image will actually be displayed on the profile page.
const BANNER_ASPECT_RATIO = DEFAULT_MESH_WIDTH / DEFAULT_BANNER_HEIGHT;

// One row of an x/yColors AutoIncrementingList. AutoIncrementingList only tracks row identity
// (a stable `id` per row, see its own docstring) - it never exposes each row's current value
// back to the parent - so this registers/unregisters its own value into the parent's map on
// mount/unmount and on every edit, which is exactly the "stateful renderItem content" usage its
// own docs call out (a ColorPicker, specifically).
const BannerColorRow = ({
  id,
  defaultValue,
  onRegister,
}: {
  readonly id: string;
  readonly defaultValue: string;
  readonly onRegister: (id: string, hex: string | null) => void;
}) => {
  useEffect(() => {
    onRegister(id, defaultValue);
    return () => onRegister(id, null);
    // Registration is keyed by `id` alone - defaultValue/onRegister only matter at mount/unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return <ColorPicker defaultValue={defaultValue} onValueChange={(hex) => onRegister(id, hex)} />;
};

const useColorRowMap = (): [Record<string, string>, (id: string, hex: string | null) => void] => {
  const [colorsById, setColorsById] = useState<Record<string, string>>({});
  const register = useCallback((id: string, hex: string | null) => {
    setColorsById((prev) => {
      if (hex === null) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: hex };
    });
  }, []);
  return [colorsById, register];
};

// The trianglify banner customization dialog - launched from ProfilePage's own edit-button
// overlay on the owner's banner. Prop-driven for persistence, same contract shape as
// AvatarEditDialog - and the same deliberate, narrow exception on the "never talks to
// @inithium/api-client" rule: this file is the storage plugin's own unconditional injection
// target, and its whole job is wiring the upload mutation into MediaField's onUpload prop.
export const BannerEditDialog = ({ initialBanner, onSave, onClose }: BannerEditDialogProps) => {
  const [uploadAsset] = useUploadAssetMutation();
  const [cellSize, setCellSize] = useState(initialBanner.cellSize);
  const [variance, setVariance] = useState(initialBanner.variance);
  const [xColorsById, registerXColor] = useColorRowMap();
  const [yColorsById, registerYColor] = useColorRowMap();
  const [imageUrl, setImageUrl] = useState(initialBanner.imageUrl ?? '');
  // Defaults to whichever mode already matches the persisted config, so reopening a
  // previously-uploaded/URL banner lands back on that tab instead of always resetting to Customize.
  const [mode, setMode] = useState(initialBanner.imageUrl ? 'url' : 'customize');
  const [isSaving, setIsSaving] = useState(false);
  const mediaFieldRef = useRef<MediaFieldHandle>(null);
  // Banner defaults to generating its mesh against a fixed reference width (DEFAULT_MESH_WIDTH)
  // whenever it isn't given a real pixel width, then stretches that mesh to fill however wide it
  // actually renders - fine when the real width is close to that reference, but visibly
  // over/under-densifies the triangles otherwise (see Banner.tsx's own comment). Measuring this
  // preview's actual wrapper and feeding it back in as an explicit width keeps the mesh
  // undistorted at whatever width the dialog happens to render at.
  const { ref: previewSizeRef, size: previewSize } = useElementSize();

  // Falls back to the initial array whenever the live map is momentarily empty (the very first
  // render, before each row's own mount effect has registered its value) - guarantees the
  // preview/save path always has at least one color, matching generateTrianglifyMesh's own
  // non-empty-array requirement, without needing to guess AutoIncrementingList's internal id
  // format to pre-seed the map.
  const xColorValues = Object.values(xColorsById);
  const yColorValues = Object.values(yColorsById);
  const xColors = xColorValues.length > 0 ? xColorValues : initialBanner.xColors;
  const yColors = yColorValues.length > 0 ? yColorValues : initialBanner.yColors;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Resolves a still-pending crop (a file was selected/dragged into position but never
      // separately "confirmed") into a real upload right here, rather than requiring a distinct
      // confirm-then-save two-step flow a user could click Save ahead of. Returns null when
      // there's nothing pending - see MediaFieldHandle's own comment on why this result must be
      // used directly instead of re-reading `imageUrl` afterward (a stale-closure trap).
      const uploaded = await mediaFieldRef.current?.resolvePendingUpload();
      const finalImageUrl = uploaded?.url ?? imageUrl;
      const banner: UserProfileBannerConfig = {
        cellSize,
        variance,
        xColors,
        yColors,
        ...(mode !== 'customize' ? { imageUrl: finalImageUrl } : {}),
      };
      await onSave(banner);
      onClose();
      alert.success('Banner updated successfully.', { position: ALERT_POSITION });
    } catch {
      alert.danger('Could not save your banner. Please try again.', { position: ALERT_POSITION });
    } finally {
      setIsSaving(false);
    }
  };

  const customizeContent = (
    <Box flex={{ direction: 'col', gap: 16 }}>
      <Slider
        label={`Cell Size — ${cellSize}`}
        min={MIN_CELL_SIZE}
        max={MAX_CELL_SIZE}
        step={1}
        value={[cellSize]}
        onValueChange={([value]) => setCellSize(value!)}
      />
      <Slider
        label={`Variance — ${variance.toFixed(2)}`}
        min={MIN_VARIANCE}
        max={MAX_VARIANCE}
        step={0.01}
        value={[variance]}
        onValueChange={([value]) => setVariance(value!)}
      />

      <Box flex={{ direction: 'col', gap: 16 }} className="sm:flex-row">
        <Box className="min-w-0 flex-1">
          <Text as="h3" className="mb-2 text-sm font-semibold">
            X Colors
          </Text>
          <AutoIncrementingList
            minCount={1}
            initialCount={Math.max(1, initialBanner.xColors.length)}
            renderItem={(index, id) => (
              <BannerColorRow id={id} defaultValue={initialBanner.xColors[index] ?? FALLBACK_COLOR_HEX} onRegister={registerXColor} />
            )}
          />
        </Box>
        <Box className="min-w-0 flex-1">
          <Text as="h3" className="mb-2 text-sm font-semibold">
            Y Colors
          </Text>
          <AutoIncrementingList
            minCount={1}
            initialCount={Math.max(1, initialBanner.yColors.length)}
            renderItem={(index, id) => (
              <BannerColorRow id={id} defaultValue={initialBanner.yColors[index] ?? FALLBACK_COLOR_HEX} onRegister={registerYColor} />
            )}
          />
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box flex={{ direction: 'col', gap: 16 }}>
      <div ref={previewSizeRef} className="w-full">
        <Banner
          imageUrl={mode !== 'customize' ? imageUrl || undefined : undefined}
          trianglifyConfig={{ cellSize, variance, xColors: xColors as [string, ...string[]], yColors: yColors as [string, ...string[]] }}
          width={previewSize?.width}
          height={PREVIEW_HEIGHT}
        />
      </div>

      <MediaField
        ref={mediaFieldRef}
        label="Banner Image"
        value={imageUrl}
        onValueChange={setImageUrl}
        onUpload={async (file) => await uploadAsset({ file, purpose: 'banner' }).unwrap()}
        maxSizeBytes={MAX_UPLOAD_SIZE_BYTES}
        aspectRatio={BANNER_ASPECT_RATIO}
        mode={mode}
        onModeChange={setMode}
        extraTabs={[{ value: 'customize', label: 'Customize', content: customizeContent }]}
      />

      <Box flex={{ direction: 'row', gap: 8, justify: 'end' }}>
        <Button variant={{ kind: 'ghost', color: 'surface' }} onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button variant={{ kind: 'filled', color: 'primary' }} onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </Box>
    </Box>
  );
};
