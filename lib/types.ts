export type Role = "admin" | "studio";
export type UserStatus = "invited" | "active" | "suspended";
export type GalleryStatus = "draft" | "published" | "unpublished";
export type AccessMode = "open" | "email" | "invite" | "password";
export type MediaKind = "photo" | "video" | "youtube";
export type MediaStatus = "uploading" | "ready" | "failed";

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  password_hash: string | null;
  status: UserStatus;
  storage_limit_bytes: number;
  invite_token: string | null;
  invite_expires_at: string | null;
  created_at: string;
  last_seen_at: string | null;
}

export interface GalleryRow {
  id: string;
  studio_id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  kind: "gallery" | "flagship";
  status: GalleryStatus;
  access_mode: AccessMode;
  password_hash: string | null;
  allow_photo_downloads: number;
  allow_video_downloads: number;
  featured: number;
  cover_item_id: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  link_version: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  view_count: number;
  meta_json: string | null;
}

export interface ChapterRow {
  id: string;
  gallery_id: string;
  title: string;
  position: number;
  created_at: string;
}

export interface MediaItemRow {
  id: string;
  gallery_id: string;
  chapter_id: string | null;
  kind: MediaKind;
  title: string | null;
  status: MediaStatus;
  position: number;
  original_name: string | null;
  mime: string | null;
  size_bytes: number;
  width: number | null;
  height: number | null;
  preview_path: string | null;
  thumb_path: string | null;
  poster_path: string | null;
  storage_path: string | null;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  youtube_id: string | null;
  youtube_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface GalleryEmailRow {
  id: string;
  gallery_id: string;
  email: string;
  created_at: string;
}

export interface SelectionRow {
  id: string;
  gallery_id: string;
  email: string | null;
  note: string | null;
  item_ids: string;
  created_at: string;
}

export interface UploadFailureRow {
  id: string;
  studio_id: string;
  gallery_id: string | null;
  file_name: string | null;
  size_bytes: number | null;
  stage: string;
  detail: string | null;
  created_at: string;
}

export interface FlagshipMeta {
  series?: string;
  institution?: string;
  lecturer?: string;
  lectureTitle?: string;
  lecturerTitle?: string;
  dateLabel?: string;
  venue?: string;
}

export interface StudioSummary {
  user: UserRow;
  gallery_count: number;
  published_count: number;
  item_count: number;
  storage_used: number;
}

export interface GalleryCard {
  id: string;
  studio_id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  status: GalleryStatus;
  access_mode: AccessMode;
  featured: number;
  kind: string;
  cover_url: string | null;
  item_count: number;
  photo_count: number;
  video_count: number;
  published_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  updated_at: string;
  studio_name: string;
  view_count: number;
}

export interface PublicMediaItem {
  id: string;
  kind: MediaKind;
  title: string;
  status: MediaStatus;
  width: number | null;
  height: number | null;
  size_bytes: number;
  attachment_size: number | null;
  attachment_name: string | null;
  preview_url: string | null;
  thumb_url: string | null;
  poster_url: string | null;
  youtube_id: string | null;
  youtube_url: string | null;
  has_attachment: boolean;
}
