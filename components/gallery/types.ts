import type { AccessMode, PublicMediaItem } from "@/lib/types";

export interface GalleryItem extends PublicMediaItem {
  chapter_id: string | null;
  created_at: string;
}

export interface GalleryChapter {
  id: string;
  title: string;
  position: number;
}

export interface GalleryMeta {
  series?: string;
  institution?: string;
  lecturer?: string;
  lectureTitle?: string;
  lecturerTitle?: string;
  dateLabel?: string;
  venue?: string;
}

export interface GalleryView {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  kind: "gallery" | "flagship";
  access_mode: AccessMode;
  allow_photo_downloads: boolean;
  allow_video_downloads: boolean;
  expires_at: string | null;
  published_at: string | null;
  studio_name: string;
  cover_url: string | null;
  canDownload: boolean;
  email: string | null;
  isOwnerPreview: boolean;
}

export function isFilm(item: GalleryItem): boolean {
  return item.kind === "video" || item.kind === "youtube";
}

export function itemCanDownload(gallery: GalleryView, item: GalleryItem, canDownload: boolean): boolean {
  if (!canDownload) return false;
  if (item.kind === "photo") return gallery.allow_photo_downloads;
  if (item.kind === "youtube") return gallery.allow_video_downloads && item.has_attachment;
  return gallery.allow_video_downloads;
}

export function itemThumbSrc(gallery: GalleryView, item: GalleryItem): string | null {
  if (item.kind === "youtube" && !item.thumb_url) return null;
  return item.thumb_url ?? item.poster_url ?? item.preview_url;
}

export function itemLargeSrc(item: GalleryItem): string | null {
  return item.preview_url ?? item.thumb_url ?? item.poster_url;
}

export function itemDownloadHref(gallery: GalleryView, item: GalleryItem): string {
  return `/api/g/${gallery.slug}/media/${item.id}/file`;
}

export function itemInlineHref(gallery: GalleryView, item: GalleryItem): string {
  return `/api/g/${gallery.slug}/media/${item.id}/file?inline=1`;
}

export function itemDisplaySize(item: GalleryItem): number {
  return Number(item.kind === "youtube" ? item.attachment_size ?? 0 : item.size_bytes ?? 0);
}

export function itemAspect(item: GalleryItem): string {
  if (isFilm(item)) return "16 / 9";
  if (item.width && item.height) return `${item.width} / ${item.height}`;
  return "3 / 4";
}

export function prettySize(bytes: number | null | undefined): string {
  const n = Number(bytes ?? 0);
  if (!Number.isFinite(n) || n <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  const value = n / Math.pow(1024, i);
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}
