import { all, get } from "./db";
import type {
  ChapterRow,
  GalleryCard,
  GalleryRow,
  MediaItemRow,
  PublicMediaItem,
  StudioSummary,
  UserRow,
} from "./types";

export function resolveCoverId(gallery: GalleryRow): string | null {
  if (gallery.cover_item_id) return gallery.cover_item_id;
  const first = get<{ id: string }>(
    "SELECT id FROM media_items WHERE gallery_id = ? AND status = 'ready' AND thumb_path IS NOT NULL ORDER BY position ASC LIMIT 1",
    gallery.id,
  );
  return first?.id ?? null;
}

export function mapGalleryCard(gallery: GalleryRow & { studio_name?: string; item_count?: number; photo_count?: number; video_count?: number }): GalleryCard {
  const coverId = resolveCoverId(gallery);
  return {
    id: gallery.id,
    studio_id: gallery.studio_id,
    slug: gallery.slug,
    title: gallery.title,
    subtitle: gallery.subtitle,
    status: gallery.status,
    access_mode: gallery.access_mode,
    featured: gallery.featured,
    kind: gallery.kind,
    cover_url: coverId ? `/api/public/cover/${gallery.slug}` : null,
    item_count: Number(gallery.item_count ?? 0),
    photo_count: Number(gallery.photo_count ?? 0),
    video_count: Number(gallery.video_count ?? 0),
    published_at: gallery.published_at,
    expires_at: gallery.expires_at,
    revoked_at: gallery.revoked_at,
    updated_at: gallery.updated_at,
    studio_name: gallery.studio_name ?? "",
    view_count: gallery.view_count,
  };
}

const CARD_SELECT = `
  SELECT g.*, CASE WHEN u.role = 'admin' THEN 'NURA-X STUDIO' ELSE u.name END AS studio_name,
    (SELECT COUNT(*) FROM media_items m WHERE m.gallery_id = g.id AND m.status = 'ready') AS item_count,
    (SELECT COUNT(*) FROM media_items m WHERE m.gallery_id = g.id AND m.status = 'ready' AND m.kind = 'photo') AS photo_count,
    (SELECT COUNT(*) FROM media_items m WHERE m.gallery_id = g.id AND m.status = 'ready' AND m.kind IN ('video','youtube')) AS video_count
  FROM galleries g JOIN users u ON u.id = g.studio_id
`;

export function featuredGalleries(limit = 6): GalleryCard[] {
  const rows = all<GalleryRow & { studio_name: string; item_count: number; photo_count: number; video_count: number }>(
    `${CARD_SELECT}
     WHERE g.featured = 1 AND g.status = 'published' AND g.revoked_at IS NULL
       AND (g.expires_at IS NULL OR g.expires_at > ?)
     ORDER BY g.published_at DESC LIMIT ?`,
    new Date().toISOString(),
    limit,
  );
  return rows.map(mapGalleryCard);
}

export function studioGalleries(studioId: string): GalleryCard[] {
  const rows = all<GalleryRow & { studio_name: string; item_count: number; photo_count: number; video_count: number }>(
    `${CARD_SELECT} WHERE g.studio_id = ? ORDER BY g.updated_at DESC`,
    studioId,
  );
  return rows.map(mapGalleryCard);
}

export function getChapters(galleryId: string): ChapterRow[] {
  return all<ChapterRow>("SELECT * FROM chapters WHERE gallery_id = ? ORDER BY position ASC, created_at ASC", galleryId);
}

export function getMediaItems(galleryId: string, includePending = false): MediaItemRow[] {
  const rows = all<MediaItemRow>(
    "SELECT * FROM media_items WHERE gallery_id = ? ORDER BY position ASC, created_at ASC",
    galleryId,
  );
  return includePending ? rows : rows.filter((r) => r.status === "ready");
}

export function studioUsageBytes(studioId: string): number {
  const row = get<{ total: number }>(
    `SELECT COALESCE(SUM(m.size_bytes + COALESCE(m.attachment_size, 0)), 0) AS total
     FROM media_items m JOIN galleries g ON g.id = m.gallery_id
     WHERE g.studio_id = ? AND m.status = 'ready'`,
    studioId,
  );
  return Number(row?.total ?? 0);
}

export function studioPendingBytes(studioId: string): number {
  const row = get<{ total: number }>(
    `SELECT COALESCE(SUM(s.expected_size), 0) AS total
     FROM upload_sessions s JOIN media_items m ON m.id = s.media_id
     JOIN galleries g ON g.id = m.gallery_id
     WHERE g.studio_id = ?`,
    studioId,
  );
  return Number(row?.total ?? 0);
}

export function studioSummaries(): StudioSummary[] {
  const users = all<UserRow>("SELECT * FROM users WHERE role = 'studio' ORDER BY created_at ASC");
  return users.map((user) => {
    const counts = get<{ gallery_count: number; published_count: number; item_count: number }>(
      `SELECT COUNT(*) AS gallery_count,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published_count,
        (SELECT COUNT(*) FROM media_items m JOIN galleries g2 ON g2.id = m.gallery_id WHERE g2.studio_id = ? AND m.status = 'ready') AS item_count
       FROM galleries WHERE studio_id = ?`,
      user.id,
      user.id,
    );
    return {
      user,
      gallery_count: Number(counts?.gallery_count ?? 0),
      published_count: Number(counts?.published_count ?? 0),
      item_count: Number(counts?.item_count ?? 0),
      storage_used: studioUsageBytes(user.id) + studioPendingBytes(user.id),
    };
  });
}

export function adminTotals() {
  const studios = get<{ count: number }>("SELECT COUNT(*) AS count FROM users WHERE role = 'studio' AND status != 'invited'")?.count ?? 0;
  const invited = get<{ count: number }>("SELECT COUNT(*) AS count FROM users WHERE role = 'studio' AND status = 'invited'")?.count ?? 0;
  const suspended = get<{ count: number }>("SELECT COUNT(*) AS count FROM users WHERE role = 'studio' AND status = 'suspended'")?.count ?? 0;
  const galleries = get<{ count: number }>("SELECT COUNT(*) AS count FROM galleries")?.count ?? 0;
  const published = get<{ count: number }>("SELECT COUNT(*) AS count FROM galleries WHERE status = 'published'")?.count ?? 0;
  const items = get<{ count: number }>("SELECT COUNT(*) AS count FROM media_items WHERE status = 'ready'")?.count ?? 0;
  const storage = get<{ total: number }>(
    "SELECT COALESCE(SUM(size_bytes + COALESCE(attachment_size, 0)), 0) AS total FROM media_items WHERE status = 'ready'",
  )?.total ?? 0;
  const pending = get<{ total: number }>("SELECT COALESCE(SUM(expected_size), 0) AS total FROM upload_sessions")?.total ?? 0;
  const failures = get<{ count: number }>("SELECT COUNT(*) AS count FROM upload_failures")?.count ?? 0;
  const selections = get<{ count: number }>("SELECT COUNT(*) AS count FROM selections")?.count ?? 0;
  const downloads = get<{ count: number }>("SELECT COUNT(*) AS count FROM downloads")?.count ?? 0;
  const views = get<{ total: number }>("SELECT COALESCE(SUM(view_count), 0) AS total FROM galleries")?.total ?? 0;

  return {
    studios: Number(studios),
    invited: Number(invited),
    suspended: Number(suspended),
    galleries: Number(galleries),
    published: Number(published),
    items: Number(items),
    storage: Number(storage),
    pending: Number(pending),
    failures: Number(failures),
    selections: Number(selections),
    downloads: Number(downloads),
    views: Number(views),
  };
}

export function allGalleriesForAdmin(): (GalleryCard & { studio_email: string; studio_status: string })[] {
  const rows = all<
    GalleryRow & {
      studio_name: string;
      studio_email: string;
      studio_status: string;
      item_count: number;
      photo_count: number;
      video_count: number;
    }
  >(
    `SELECT g.*, u.name AS studio_name, u.email AS studio_email, u.status AS studio_status,
      (SELECT COUNT(*) FROM media_items m WHERE m.gallery_id = g.id AND m.status = 'ready') AS item_count,
      (SELECT COUNT(*) FROM media_items m WHERE m.gallery_id = g.id AND m.status = 'ready' AND m.kind = 'photo') AS photo_count,
      (SELECT COUNT(*) FROM media_items m WHERE m.gallery_id = g.id AND m.status = 'ready' AND m.kind IN ('video','youtube')) AS video_count
     FROM galleries g JOIN users u ON u.id = g.studio_id
     ORDER BY g.updated_at DESC`,
  );
  return rows.map((row) => ({
    ...mapGalleryCard(row),
    studio_email: row.studio_email,
    studio_status: row.studio_status,
  }));
}

export function publicItemsFor(gallery: GalleryRow, items: MediaItemRow[]): PublicMediaItem[] {
  return items.map((item) => {
    const base = `/api/g/${gallery.slug}/media/${item.id}`;
    const ready = item.status === "ready";
    return {
      id: item.id,
      kind: item.kind,
      title: item.title || item.original_name || (item.kind === "photo" ? "Photograph" : item.kind === "video" ? "Film" : "Film"),
      status: item.status,
      width: item.width,
      height: item.height,
      size_bytes: Number(item.size_bytes ?? 0),
      attachment_size: item.attachment_size ? Number(item.attachment_size) : null,
      attachment_name: item.attachment_name,
      preview_url: ready && item.preview_path ? `${base}/preview` : null,
      thumb_url:
        ready && item.thumb_path
          ? `${base}/thumb`
          : item.kind === "youtube" && item.youtube_id
            ? `https://i.ytimg.com/vi/${item.youtube_id}/hqdefault.jpg`
            : null,
      poster_url: ready && item.poster_path ? `${base}/poster` : null,
      youtube_id: item.youtube_id,
      youtube_url: item.youtube_url,
      has_attachment: Boolean(item.attachment_path),
    };
  });
}

export function studioName(studioId: string): string {
  const owner = get<{ name: string; role: string }>("SELECT name, role FROM users WHERE id = ?", studioId);
  if (owner?.role === "admin") return "NURA-X STUDIO";
  return owner?.name ?? "Studio";
}
