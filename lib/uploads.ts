import { randomUUID } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { db, get, nowIso } from "./db";
import { MEDIA_ROOT, PHOTO_EXTENSIONS, TEMP_ROOT, VIDEO_EXTENSIONS } from "./config";
import type { GalleryRow, MediaItemRow, UserRow } from "./types";

export interface UploadSessionRow {
  id: string;
  media_id: string | null;
  target: "media" | "attachment";
  expected_size: number;
  received_bytes: number;
  temp_path: string;
  kind: string;
  created_at: string;
}

export function safeExtension(fileName: string, kind: "photo" | "video"): string {
  const ext = path.extname(fileName).toLowerCase();
  if (kind === "photo" && PHOTO_EXTENSIONS.includes(ext)) return ext;
  if (kind === "video" && VIDEO_EXTENSIONS.includes(ext)) return ext;
  return kind === "photo" ? ".jpg" : ".mp4";
}

export function logUploadFailure(input: {
  studioId: string;
  galleryId: string | null;
  fileName: string | null;
  size: number | null;
  stage: string;
  detail: string | null;
}): void {
  db.prepare(
    `INSERT INTO upload_failures (id, studio_id, gallery_id, file_name, size_bytes, stage, detail, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    randomUUID(),
    input.studioId,
    input.galleryId,
    input.fileName?.slice(0, 200) ?? null,
    input.size,
    input.stage,
    input.detail?.slice(0, 500) ?? null,
    nowIso(),
  );
}

export function cleanupStaleSessions(): void {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const stale = db
    .prepare("SELECT * FROM upload_sessions WHERE created_at < ?")
    .all(cutoff) as unknown as UploadSessionRow[];
  for (const session of stale) {
    try {
      fs.rmSync(session.temp_path, { force: true });
    } catch {
      // ignore
    }
    db.prepare("DELETE FROM upload_sessions WHERE id = ?").run(session.id);
  }
}

export function sessionTempPath(sessionId: string): string {
  return path.join(TEMP_ROOT, `${sessionId}.part`);
}

export function ownedSession(
  uploadId: string,
  studioId: string,
): { session: UploadSessionRow; item: MediaItemRow; gallery: GalleryRow } | null {
  const session = get<UploadSessionRow>("SELECT * FROM upload_sessions WHERE id = ?", uploadId);
  if (!session) return null;
  const item = session.media_id
    ? get<MediaItemRow>("SELECT * FROM media_items WHERE id = ?", session.media_id)
    : undefined;
  if (!item) return null;
  const gallery = get<GalleryRow>("SELECT * FROM galleries WHERE id = ? AND studio_id = ?", item.gallery_id, studioId);
  if (!gallery) return null;
  return { session, item, gallery };
}

export interface Quota {
  used: number;
  pending: number;
  limit: number;
  remaining: number;
}

export function quotaFor(user: UserRow): Quota {
  const used =
    Number(
      get<{ total: number }>(
        `SELECT COALESCE(SUM(m.size_bytes + COALESCE(m.attachment_size, 0)), 0) AS total
         FROM media_items m JOIN galleries g ON g.id = m.gallery_id
         WHERE g.studio_id = ? AND m.status = 'ready'`,
        user.id,
      )?.total ?? 0,
    ) || 0;
  const pending =
    Number(
      get<{ total: number }>(
        `SELECT COALESCE(SUM(s.expected_size), 0) AS total
         FROM upload_sessions s JOIN media_items m ON m.id = s.media_id
         JOIN galleries g ON g.id = m.gallery_id
         WHERE g.studio_id = ?`,
        user.id,
      )?.total ?? 0,
    ) || 0;
  return {
    used,
    pending,
    limit: user.storage_limit_bytes,
    remaining: Math.max(user.storage_limit_bytes - used - pending, 0),
  };
}

export function tempExists(absPath: string): boolean {
  try {
    return fs.statSync(absPath).isFile();
  } catch {
    return false;
  }
}

export function ensureTempFile(absPath: string): void {
  fs.mkdirSync(TEMP_ROOT, { recursive: true });
  if (!fs.existsSync(absPath)) fs.writeFileSync(absPath, Buffer.alloc(0));
}

export async function removeFileQuiet(absPath: string | null | undefined): Promise<void> {
  if (!absPath) return;
  await fsp.rm(absPath, { force: true });
}

export function itemStorageAbs(relative: string | null | undefined): string | null {
  if (!relative) return null;
  const abs = path.resolve(MEDIA_ROOT, relative);
  if (!abs.startsWith(path.resolve(MEDIA_ROOT))) return null;
  return abs;
}
