import { get } from "./db";
import { getCurrentUser } from "./auth";
import type { GalleryRow, UserRow } from "./types";

export async function studioUser(): Promise<UserRow | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "studio" || user.status !== "active") return null;
  return user;
}

export async function adminUser(): Promise<UserRow | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

export function ownedGallery(galleryId: string, studioId: string): GalleryRow | undefined {
  return get<GalleryRow>("SELECT * FROM galleries WHERE id = ? AND studio_id = ?", galleryId, studioId);
}

export function maxItemPosition(galleryId: string): number {
  const row = get<{ max: number | null }>("SELECT MAX(position) AS max FROM media_items WHERE gallery_id = ?", galleryId);
  return Number(row?.max ?? -1) + 1;
}

export function maxChapterPosition(galleryId: string): number {
  const row = get<{ max: number | null }>("SELECT MAX(position) AS max FROM chapters WHERE gallery_id = ?", galleryId);
  return Number(row?.max ?? -1) + 1;
}

export function titleFromFilename(fileName: string): string {
  const base = fileName.replace(/\.[a-z0-9]{1,8}$/i, "").replace(/[_-]+/g, " ").trim();
  return base.slice(0, 120) || "Untitled";
}
