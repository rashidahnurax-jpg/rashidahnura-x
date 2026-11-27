import { all } from "./db";
import { quotaFor } from "./uploads";
import type { ChapterRow, GalleryEmailRow, GalleryRow, MediaItemRow, UserRow } from "./types";

export function managerPayload(gallery: GalleryRow, user: UserRow) {
  const chapters = all<ChapterRow>(
    "SELECT id, title, position, created_at FROM chapters WHERE gallery_id = ? ORDER BY position ASC, created_at ASC",
    gallery.id,
  );
  const rows = all<MediaItemRow>(
    "SELECT * FROM media_items WHERE gallery_id = ? ORDER BY position ASC, created_at ASC",
    gallery.id,
  );
  const emails = all<GalleryEmailRow>(
    "SELECT email FROM gallery_emails WHERE gallery_id = ? ORDER BY created_at ASC",
    gallery.id,
  ).map((row) => row.email);

  return {
    gallery: {
      id: gallery.id,
      slug: gallery.slug,
      title: gallery.title,
      subtitle: gallery.subtitle,
      description: gallery.description,
      kind: gallery.kind,
      status: gallery.status,
      access_mode: gallery.access_mode,
      allow_photo_downloads: gallery.allow_photo_downloads,
      allow_video_downloads: gallery.allow_video_downloads,
      featured: gallery.featured,
      cover_item_id: gallery.cover_item_id,
      expires_at: gallery.expires_at,
      revoked_at: gallery.revoked_at,
      published_at: gallery.published_at,
      created_at: gallery.created_at,
      updated_at: gallery.updated_at,
      view_count: gallery.view_count,
      has_password: Boolean(gallery.password_hash),
    },
    chapters: chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      position: chapter.position,
    })),
    items: rows.map((item) => ({
      id: item.id,
      chapter_id: item.chapter_id,
      kind: item.kind,
      title: item.title,
      status: item.status,
      position: item.position,
      original_name: item.original_name,
      mime: item.mime,
      size_bytes: Number(item.size_bytes ?? 0),
      width: item.width,
      height: item.height,
      attachment_name: item.attachment_name,
      attachment_size: item.attachment_size === null ? null : Number(item.attachment_size),
      youtube_id: item.youtube_id,
      youtube_url: item.youtube_url,
      has_attachment: Boolean(item.attachment_path),
      has_poster: Boolean(item.poster_path),
      has_preview: Boolean(item.preview_path),
      has_thumb: Boolean(item.thumb_path),
      created_at: item.created_at,
    })),
    emails,
    quota: quotaFor(user),
  };
}

export type ManagerPayload = ReturnType<typeof managerPayload>;
