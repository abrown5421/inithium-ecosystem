import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { Box, Button, Input, Tabs, TabsContent, TabsList, TabsTrigger, Text } from '../components';
import { FieldShell } from '../components/FieldShell/FieldShell';
import { useElementSize } from './useElementSize';
import type { FieldProps } from '../tokens/field';

export interface MediaFieldTab {
  readonly value: string;
  readonly label: string;
  readonly content: ReactNode;
}

export interface UploadedAsset {
  readonly url: string;
  readonly assetId: string;
}

export interface MediaFieldProps extends FieldProps {
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (url: string) => void;
  // Fires only on a successful Upload commit (null on a URL-paste commit or when nothing has
  // been chosen yet) - richer future consumers that want to persist the assetId (not just the
  // bare url every consumer in this pass stores) use this.
  readonly onAssetChange?: (asset: UploadedAsset | null) => void;
  // Undefined = no Upload tab renders. This is the entire "is storage installed" signal: only a
  // storage-aware replacement of the calling dialog ever supplies this prop, and which version
  // of that file is on disk is controlled by the CLI's existing requires-gated injection
  // mechanism - MediaField itself never imports @inithium/storage or @inithium/api-client.
  readonly onUpload?: (file: File) => Promise<UploadedAsset>;
  // Composition slot - a caller's own generator UI (Avatar's dicebear/initials controls,
  // Banner's trianglify controls) renders here unchanged; MediaField never imports either.
  readonly extraTabs?: readonly MediaFieldTab[];
  readonly mode?: string;
  readonly defaultMode?: string;
  readonly onModeChange?: (mode: string) => void;
  readonly accept?: string;
  readonly maxSizeBytes?: number;
  // width / height of the crop frame a selected file is dragged against before upload - callers
  // whose display container isn't square (Banner's wide strip vs Avatar's 1:1 circle) must pass
  // their own real ratio, or an uploaded image ends up centered against the wrong shape (see
  // ImageCropStep's own comment on why this can't just default to whatever the source image is).
  readonly aspectRatio?: number;
  readonly name?: string;
  readonly id?: string;
  readonly className?: string;
}

const DEFAULT_ACCEPT = 'image/*';
const DEFAULT_ASPECT_RATIO = 1;
// Caps the exported crop's long edge - full source resolution within the visible crop region
// would otherwise scale with however large the user's source photo happens to be (a 12MP phone
// photo cropped to a thin banner strip can still be several thousand px wide), well past what an
// avatar/banner ever needs and well past the 5MB server-side cap this would risk hitting at
// higher resolutions.
const MAX_CROP_OUTPUT_DIMENSION = 1600;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

interface ImageCropStepProps {
  readonly file: File;
  readonly aspectRatio: number;
  readonly onConfirm: (file: File) => void;
  readonly onCancel: () => void;
}

// Pan-only reposition-before-upload step (no zoom) - the source image is scaled to fully cover
// a fixed-aspect-ratio frame (the same "cover" behavior CSS object-fit: cover already applies at
// render time, just computed explicitly here so drag bounds can be derived from it), then the
// user drags it within that frame. Dragging is clamped so the frame can never reveal empty space
// past the image's edges. Confirming reads the visible region back out of the source image at
// its own native resolution (Canvas's drawImage source rect is always in natural-image pixels,
// regardless of the image's current CSS-rendered size) and exports it as a new File, which
// becomes what actually gets uploaded - MediaField's onUpload never sees the original,
// un-cropped file.
const ImageCropStep = ({ file, aspectRatio, onConfirm, onCancel }: ImageCropStepProps) => {
  const objectUrl = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(objectUrl), [objectUrl]);

  const { ref: frameRef, size: frameSize } = useElementSize();
  const imgRef = useRef<HTMLImageElement>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  // Centers the image in the frame exactly once, the first moment both measurements are known -
  // re-centering on every later resize would fight the user's own drag.
  const hasCenteredRef = useRef(false);

  const frameWidth = frameSize?.width ?? 0;
  const frameHeight = frameSize?.height ?? 0;
  const scale =
    naturalSize && frameWidth && frameHeight
      ? Math.max(frameWidth / naturalSize.width, frameHeight / naturalSize.height)
      : 0;
  const scaledWidth = naturalSize ? naturalSize.width * scale : 0;
  const scaledHeight = naturalSize ? naturalSize.height * scale : 0;
  // <= 0 by construction (scale was chosen so the image covers the frame on both axes), so the
  // image can only ever be dragged until one of its edges meets the frame's edge, never past it.
  const minX = frameWidth - scaledWidth;
  const minY = frameHeight - scaledHeight;

  useEffect(() => {
    if (hasCenteredRef.current || !scale) return;
    setPosition({ x: minX / 2, y: minY / 2 });
    hasCenteredRef.current = true;
  }, [scale, minX, minY]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!scale) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    dragStateRef.current = { startX: event.clientX, startY: event.clientY, originX: position.x, originY: position.y };
  };
  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    const dx = event.clientX - dragStateRef.current.startX;
    const dy = event.clientY - dragStateRef.current.startY;
    setPosition({
      x: clamp(dragStateRef.current.originX + dx, minX, 0),
      y: clamp(dragStateRef.current.originY + dy, minY, 0),
    });
  };
  const endDrag = () => {
    dragStateRef.current = null;
    setIsDragging(false);
  };

  const handleConfirm = () => {
    if (!imgRef.current || !scale) return;
    // Map the visible frame rectangle (CSS px, frame-relative) back into the source image's own
    // natural pixel coordinates by undoing `scale`.
    const sx = -position.x / scale;
    const sy = -position.y / scale;
    const sWidth = frameWidth / scale;
    const sHeight = frameHeight / scale;

    const outputWidth = Math.round(Math.min(sWidth, MAX_CROP_OUTPUT_DIMENSION));
    const outputHeight = Math.round(outputWidth / aspectRatio);

    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(imgRef.current, sx, sy, sWidth, sHeight, 0, 0, outputWidth, outputHeight);

    // Preserves PNG (so a transparent logo/graphic stays transparent) - everything else exports
    // as JPEG regardless of source format, which covers the vast majority of photo uploads well.
    const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onConfirm(new File([blob], file.name, { type: outputType }));
      },
      outputType,
      0.9,
    );
  };

  return (
    <Box flex={{ direction: 'col', gap: 8 }}>
      <Text as="p" className="text-xs text-surface-400">
        Drag to reposition
      </Text>
      <div
        ref={frameRef}
        className="relative w-full touch-none select-none overflow-hidden rounded-md border border-surface-300"
        style={{ aspectRatio: String(aspectRatio), cursor: isDragging ? 'grabbing' : 'grab' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <img
          ref={imgRef}
          src={objectUrl}
          alt=""
          draggable={false}
          onLoad={(event) => {
            const target = event.currentTarget;
            setNaturalSize({ width: target.naturalWidth, height: target.naturalHeight });
          }}
          className="absolute left-0 top-0 max-w-none"
          style={{
            width: scaledWidth ? `${scaledWidth}px` : undefined,
            height: scaledHeight ? `${scaledHeight}px` : undefined,
            transform: `translate(${position.x}px, ${position.y}px)`,
          }}
        />
      </div>
      <Box flex={{ direction: 'row', gap: 8, justify: 'end' }}>
        <Button variant={{ kind: 'ghost', color: 'surface' }} onClick={onCancel}>
          Cancel
        </Button>
        <Button variant={{ kind: 'filled', color: 'primary' }} onClick={handleConfirm} disabled={!scale}>
          Use This Crop
        </Button>
      </Box>
    </Box>
  );
};

export const MediaField = ({
  label,
  required,
  disabled,
  error,
  helperText,
  value,
  defaultValue,
  onValueChange,
  onAssetChange,
  onUpload,
  extraTabs = [],
  mode,
  defaultMode,
  onModeChange,
  accept = DEFAULT_ACCEPT,
  maxSizeBytes,
  aspectRatio = DEFAULT_ASPECT_RATIO,
  name,
  className,
}: MediaFieldProps) => {
  const autoId = useId();
  const helperTextId = helperText !== undefined ? `${autoId}-helper` : undefined;

  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? '');
  const isValueControlled = value !== undefined;
  const currentValue = isValueControlled ? (value ?? '') : uncontrolledValue;

  const [urlDraft, setUrlDraft] = useState(currentValue);

  const [uncontrolledMode, setUncontrolledMode] = useState(defaultMode ?? extraTabs[0]?.value ?? 'url');
  const isModeControlled = mode !== undefined;
  const currentMode = isModeControlled ? (mode ?? 'url') : uncontrolledMode;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | undefined>(undefined);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleModeChange = (nextMode: string) => {
    if (!isModeControlled) setUncontrolledMode(nextMode);
    onModeChange?.(nextMode);
  };

  const commit = (url: string, asset: UploadedAsset | null) => {
    if (!isValueControlled) setUncontrolledValue(url);
    setUrlDraft(url);
    onValueChange?.(url);
    onAssetChange?.(asset);
  };

  const runUpload = async (fileToUpload: File) => {
    if (!onUpload) return;
    setIsUploading(true);
    try {
      const result = await onUpload(fileToUpload);
      commit(result.url, result);
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (maxSizeBytes && file.size > maxSizeBytes) {
      setUploadError(`File is too large. Max size is ${Math.round(maxSizeBytes / (1024 * 1024))}MB.`);
      return;
    }

    setUploadError(undefined);
    setCropFile(file);
  };

  return (
    <FieldShell label={label} required={required} error={error} helperText={helperText} helperTextId={helperTextId} className={className}>
      <Box borderColor={{ color: 'surface', intensity: 300 }} className="rounded-md border" padding={{ base: 12 }}>
        <Tabs value={currentMode} onValueChange={handleModeChange}>
          <TabsList>
            {extraTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
            <TabsTrigger value="url">URL</TabsTrigger>
            {onUpload && <TabsTrigger value="upload">Upload</TabsTrigger>}
          </TabsList>

          {extraTabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.content}
            </TabsContent>
          ))}

          <TabsContent value="url">
            <Box flex={{ direction: 'col', gap: 8 }}>
              <Input label="Image URL" name={name} disabled={disabled} value={urlDraft} onChange={(event) => setUrlDraft(event.target.value)} />
              <Box flex={{ direction: 'row', justify: 'end' }}>
                <Button
                  variant={{ kind: 'filled', color: 'primary' }}
                  onClick={() => urlDraft.trim() && commit(urlDraft.trim(), null)}
                  disabled={disabled || !urlDraft.trim()}
                >
                  Use URL
                </Button>
              </Box>
            </Box>
          </TabsContent>

          {onUpload && (
            <TabsContent value="upload">
              {cropFile ? (
                <ImageCropStep
                  file={cropFile}
                  aspectRatio={aspectRatio}
                  onCancel={() => setCropFile(null)}
                  onConfirm={(croppedFile) => {
                    setCropFile(null);
                    void runUpload(croppedFile);
                  }}
                />
              ) : (
                <Box flex={{ direction: 'col', gap: 8 }}>
                  <input ref={fileInputRef} type="file" accept={accept} className="hidden" onChange={handleFileSelected} />
                  <Box flex={{ direction: 'row', align: 'center', gap: 8 }}>
                    <Button
                      variant={{ kind: 'filled', color: 'primary' }}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={disabled || isUploading}
                    >
                      {isUploading ? 'Uploading…' : 'Choose File'}
                    </Button>
                    {currentValue && !isUploading ? <img src={currentValue} alt="" className="h-10 w-10 rounded object-cover" /> : null}
                  </Box>
                  {uploadError ? (
                    <Text as="p" className="text-xs text-red-500">
                      {uploadError}
                    </Text>
                  ) : null}
                </Box>
              )}
            </TabsContent>
          )}
        </Tabs>
      </Box>
    </FieldShell>
  );
};
