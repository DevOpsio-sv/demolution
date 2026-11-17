import manifest from "./photo-manifest.json";

export interface Photo {
  id: string;
  alt: string;
  width: number;
  height: number;
  src: string;
  avif: string;
  webp: string;
}

export const photos = manifest as Record<string, Photo>;

export function photo(id: string): Photo {
  const item = photos[id];
  if (!item) throw new Error(`Missing photo: ${id}`);
  return item;
}
