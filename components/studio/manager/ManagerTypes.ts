export type ManagerStatus = "draft" | "published" | "unpublished";
export type ManagerAccessMode = "open" | "email" | "invite" | "password";
export type ManagerItemKind = "photo" | "video" | "youtube";
export type ManagerItemStatus = "uploading" | "ready" | "failed";

export interface ManagerGallery {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  kind: "gallery" | "flagship";
  status: ManagerStatus;
  access_mode: ManagerAccessMode;
  allow_photo_downloads: number;
  allow_video_downloads: number;
  featured: number;
  cover_item_id: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  view_count: number;
  has_password: boolean;
}

export interface ManagerChapter {
  id: string;
  title: string;
  position: number;
}

export interface ManagerItem {
  id: string;
  chapter_id: string | null;
  kind: ManagerItemKind;
  title: string | null;
  status: ManagerItemStatus;
  position: number;
  original_name: string | null;
  mime: string | null;
  size_bytes: number;
  width: number | null;
  height: number | null;
  attachment_name: string | null;
  attachment_size: number | null;
  youtube_id: string | null;
  youtube_url: string | null;
  has_attachment: boolean;
  has_poster: boolean;
  has_preview: boolean;
  has_thumb: boolean;
  created_at: string;
}

export interface ManagerQuota {
  used: number;
  pending: number;
  limit: number;
  remaining: number;
}

export interface ManagerData {
  gallery: ManagerGallery;
  chapters: ManagerChapter[];
  items: ManagerItem[];
  emails: string[];
  quota: ManagerQuota;
}

export function mediaApi(slug: string, itemId: string, variant: "thumb" | "preview" | "poster" | "file") {
  return `/api/g/${slug}/media/${itemId}/${variant}`;
}

export function ytThumb(videoId: string | null) {
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
}

export function itemThumb(gallerySlug: string, item: ManagerItem): string | null {
  if (item.has_thumb) return mediaApi(gallerySlug, item.id, "thumb");
  if (item.kind === "youtube") return ytThumb(item.youtube_id);
  if (item.has_poster) return mediaApi(gallerySlug, item.id, "poster");
  return null;
}

export function itemLarge(gallerySlug: string, item: ManagerItem): string | null {
  if (item.has_preview) return mediaApi(gallerySlug, item.id, "preview");
  if (item.has_poster) return mediaApi(gallerySlug, item.id, "poster");
  if (item.kind === "youtube") return ytThumb(item.youtube_id);
  return null;
}

export function apiError(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const message = (data as { error?: unknown }).error;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

export function expireLabel(iso: string | null): string {
  if (!iso) return "No expiry";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
