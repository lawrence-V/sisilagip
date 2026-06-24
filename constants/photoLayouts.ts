import { type PhotoLayout } from '@/types/PhotoLayout';

export const PHOTO_LAYOUTS: readonly PhotoLayout[] = [
  {
    id: 'classic-strip',
    name: 'Classic Strip',
    description: '1×4 Vertical',
    photoCount: 4,
    columns: 1,
  },
  {
    id: 'duo',
    name: 'The Duo',
    description: '1×2 Portrait',
    photoCount: 2,
    columns: 1,
  },
  {
    id: 'quad-grid',
    name: 'Quad Grid',
    description: '2×2 Square',
    photoCount: 4,
    columns: 2,
  },
  {
    id: 'full-frame',
    name: 'Full Frame',
    description: '1×1 Single',
    photoCount: 1,
    columns: 1,
  },
  {
    id: 'six-grid',
    name: 'Story Six',
    description: '3×2 Landscape Grid',
    photoCount: 6,
    columns: 3,
  },
] as const;

export const DEFAULT_PHOTO_LAYOUT_ID = 'duo' as const;

export function getPhotoLayout(layoutId: string | undefined) {
  return (
    PHOTO_LAYOUTS.find((layout) => layout.id === layoutId) ??
    PHOTO_LAYOUTS.find((layout) => layout.id === DEFAULT_PHOTO_LAYOUT_ID) ??
    PHOTO_LAYOUTS[0]
  );
}
