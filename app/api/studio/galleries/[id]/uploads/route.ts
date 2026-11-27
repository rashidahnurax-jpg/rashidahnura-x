import { randomUUID } from "node:crypto";
import { db, get, nowIso, ready } from "@/lib/db";
import { ownedGallery, studioUser, titleFromFilename } from "@/lib/studio";
import { jsonError, jsonOk, readJson, sameOrigin } from "@/lib/http";
import { CHUNK_SIZE, MAX_UPLOAD_BYTES, PHOTO_EXTENSIONS, VIDEO_EXTENSIONS } from "@/lib/config";
import { cleanupStaleSessions, ensureTempFile, quotaFor, safeExtension, sessionTempPath } from "@/lib/uploads";
import { maxItemPosition } from "@/lib/studio";
import type { ChapterRow, MediaItemRow, UserRow } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await ready();
  const user = await studioUser();
  if (!user) return jsonError("Not authorised", 403);
  const { id } = await params;
  const gallery = ownedGallery(id, user.id);
  if (!gallery) return jsonError("Gallery not found", 404);

  cleanupStaleSessions();
  const sessions = db
    .prepare(
      `SELECT s.id, s.media_id, s.target, s.expected_size, s.received_bytes, s.kind, s.created_at,
        m.original_name, m.chapter_id, m.kind AS item_kind
       FROM upload_sessions s JOIN media_items m ON m.id = s.media_id
       WHERE m.gallery_id = ? ORDER BY s.created_at ASC`,
    )
    .all(gallery.id) as unknown as {
    id: string;
    media_id: string;
    target: string;
    expected_size: number;
    received_bytes: number;
    kind: string;
    created_at: string;
    original_name: string | null;
    chapter_id: string | null;
    item_kind: string;
  }[];

  return jsonOk({
    sessions: sessions.map((s) => ({
      uploadId: s.id,
      mediaId: s.media_id,
      target: s.target,
      expected: Number(s.expected_size),
      received: Number(s.received_bytes),
      fileName: s.original_name,
      chapterId: s.chapter_id,
      itemKind: s.item_kind,
      createdAt: s.created_at,
    })),
    quota: quotaFor(user),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  await ready();
  const user = await studioUser();
  if (!user) return jsonError("Not authorised", 403);
  const { id } = await params;
  const gallery = ownedGallery(id, user.id);
  if (!gallery) return jsonError("Gallery not found", 404);

  cleanupStaleSessions();

  const body = await readJson<{
    fileName?: string;
    size?: number;
    mime?: string;
    kind?: "photo" | "video";
    chapterId?: string;
    attachmentFor?: string;
  }>(req);
  const fileName = String(body?.fileName ?? "").replace(/[\/\\]/g, "-").slice(0, 200);
  const size = Number(body?.size ?? 0);
  if (!fileName) return jsonError("Missing file name.", 400);
  if (!Number.isFinite(size) || size <= 0) return jsonError("This file is empty.", 400);
  if (size > MAX_UPLOAD_BYTES) return jsonError("Files are limited to 8 GB.", 413);

  const quota = quotaFor(user as UserRow);
  if (quota.remaining < size) {
    return jsonError(
      `Not enough storage. ${Math.round(quota.remaining / 1024 ** 2)} MB remaining on this studio account.`,
      413,
    );
  }

  if (body?.attachmentFor) {
    const item = get<MediaItemRow>(
      "SELECT * FROM media_items WHERE id = ? AND gallery_id = ? AND kind = 'youtube'",
      String(body.attachmentFor),
      gallery.id,
    );
    if (!item) return jsonError("YouTube entry not found.", 404);
    const ext = (fileName.match(/\.[a-z0-9]{1,8}$/i)?.[0] ?? "").toLowerCase();
    if (!VIDEO_EXTENSIONS.includes(ext)) {
      return jsonError("Attach a video file (MP4, MOV, WebM).", 400);
    }
    const sessionId = randomUUID();
    const temp = sessionTempPath(sessionId);
    ensureTempFile(temp);
    db.prepare(
      `INSERT INTO upload_sessions (id, media_id, target, expected_size, received_bytes, temp_path, kind, created_at)
       VALUES (?, ?, 'attachment', ?, 0, ?, 'video', ?)`,
    ).run(sessionId, item.id, size, temp, nowIso());
    return jsonOk(
      { uploadId: sessionId, mediaId: item.id, target: "attachment", offset: 0, chunkSize: CHUNK_SIZE },
      { status: 201 },
    );
  }

  const kind = body?.kind === "video" ? "video" : "photo";
  const ext = (fileName.match(/\.[a-z0-9]{1,8}$/i)?.[0] ?? "").toLowerCase();
  if (kind === "photo" && !PHOTO_EXTENSIONS.includes(ext)) {
    return jsonError("That image format is not supported.", 400);
  }
  if (kind === "video" && !VIDEO_EXTENSIONS.includes(ext)) {
    return jsonError("That video format is not supported.", 400);
  }

  let chapterId: string | null = null;
  if (body?.chapterId) {
    const chapter = get<ChapterRow>(
      "SELECT * FROM chapters WHERE id = ? AND gallery_id = ?",
      body.chapterId,
      gallery.id,
    );
    chapterId = chapter?.id ?? null;
  }
  if (!chapterId) {
    const first = get<ChapterRow>("SELECT * FROM chapters WHERE gallery_id = ? ORDER BY position ASC LIMIT 1", gallery.id);
    chapterId = first?.id ?? null;
  }

  const mediaId = randomUUID();
  const sessionId = randomUUID();
  const now = nowIso();
  db.prepare(
    `INSERT INTO media_items
      (id, gallery_id, chapter_id, kind, title, status, position, original_name, mime, size_bytes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'uploading', ?, ?, ?, 0, ?, ?)`,
  ).run(
    mediaId,
    gallery.id,
    chapterId,
    kind,
    titleFromFilename(fileName),
    maxItemPosition(gallery.id),
    fileName,
    typeof body?.mime === "string" ? body.mime.slice(0, 100) : null,
    now,
    now,
  );

  const temp = sessionTempPath(sessionId);
  ensureTempFile(temp);
  db.prepare(
    `INSERT INTO upload_sessions (id, media_id, target, expected_size, received_bytes, temp_path, kind, created_at)
     VALUES (?, ?, 'media', ?, 0, ?, ?, ?)`,
  ).run(sessionId, mediaId, size, temp, kind, now);
  db.prepare("UPDATE galleries SET updated_at = ? WHERE id = ?").run(now, gallery.id);

  return jsonOk(
    {
      uploadId: sessionId,
      mediaId,
      target: "media",
      offset: 0,
      chunkSize: CHUNK_SIZE,
      extension: safeExtension(fileName, kind),
    },
    { status: 201 },
  );
}
