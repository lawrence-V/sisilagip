export type PhotoLayoutId = 'classic-strip' | 'duo' | 'full-frame' | 'quad-grid' | 'six-grid';

export type PhotoLayout = {
  columns: number;
  description: string;
  id: PhotoLayoutId;
  name: string;
  photoCount: number;
};
