import { all } from "./db";

export interface AdminFailure {
  id: string;
  file_name: string | null;
  size_bytes: number | null;
  stage: string;
  detail: string | null;
  created_at: string;
  studio_name: string;
  studio_email: string;
  gallery_title: string | null;
  gallery_slug: string | null;
}

export function adminFailures(limit = 12): AdminFailure[] {
  return all<AdminFailure>(
    `SELECT f.id, f.file_name, f.size_bytes, f.stage, f.detail, f.created_at,
      u.name AS studio_name, u.email AS studio_email,
      g.title AS gallery_title, g.slug AS gallery_slug
     FROM upload_failures f
     JOIN users u ON u.id = f.studio_id
     LEFT JOIN galleries g ON g.id = f.gallery_id
     ORDER BY f.created_at DESC LIMIT ?`,
    limit,
  );
}

export interface AdminSelection {
  id: string;
  email: string | null;
  note: string | null;
  created_at: string;
  gallery_title: string;
  gallery_slug: string;
  item_count: number;
  item_ids: string[];
}

export function adminSelections(limit = 10): AdminSelection[] {
  const rows = all<Omit<AdminSelection, "item_count" | "item_ids"> & { item_ids: string }>(
    `SELECT s.id, s.email, s.note, s.created_at, g.title AS gallery_title, g.slug AS gallery_slug, s.item_ids
     FROM selections s JOIN galleries g ON g.id = s.gallery_id
     ORDER BY s.created_at DESC LIMIT ?`,
    limit,
  );
  return rows.map((row) => {
    let ids: string[] = [];
    try {
      const parsed = JSON.parse(row.item_ids);
      if (Array.isArray(parsed)) ids = parsed.filter((value): value is string => typeof value === "string");
    } catch {
      ids = [];
    }
    return { ...row, item_ids: ids, item_count: ids.length };
  });
}

export interface AdminDownload {
  id: string;
  email: string | null;
  kind: string;
  bytes: number;
  created_at: string;
  gallery_title: string;
  gallery_slug: string;
}

export function adminDownloads(limit = 10): AdminDownload[] {
  return all<AdminDownload>(
    `SELECT d.id, d.email, d.kind, d.bytes, d.created_at, g.title AS gallery_title, g.slug AS gallery_slug
     FROM downloads d JOIN galleries g ON g.id = d.gallery_id
     ORDER BY d.created_at DESC LIMIT ?`,
    limit,
  );
}
