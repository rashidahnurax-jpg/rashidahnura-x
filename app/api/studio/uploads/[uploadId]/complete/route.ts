import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { MEDIA_ROOT } from "@/lib/config";
import { db, get, nowIso, ready } from "@/lib/db";
import { studioUser } from "@/lib/studio";
import { jsonError, jsonOk, sameOrigin } from "@/lib/http";
import { mimeForName, itemDir, relativeMediaPath, removeItemFiles, buildPhotoDerivatives } from "@/lib/storage";
import { logUploadFailure, ownedSession, removeFileQuiet, safeExtension } from "@/lib/uploads";
import type { MediaItemRow } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ uploadId: string }> }) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  await ready();
  const user = await studioUser();
  if (!user) return jsonError("Not authorised", 403);
  const { uploadId } = await params;
  const owned = ownedSession(uploadId, user.id);
  if (!owned) return jsonError("Upload session not found. Start the upload again.", 404, { expired: true });

  const { session, item, gallery } = owned;
  const expected = Number(session.expected_size);
  let size = 0;
  try {
    size = fs.statSync(session.temp_path).size;
  } catch {
    return jsonError("The uploaded file is missing. Start again.", 410, { expired: true });
  }
  if (size !== expected) {
    return jsonError("The upload is not complete yet.", 409, { offset: size });
  }

  const dir = itemDir(gallery.id, item.id);
  await fsp.mkdir(dir, { recursive: true });
  const now = nowIso();

  if (session.target === "attachment") {
    const extension = safeExtension(item.original_name ?? "attachment.mp4", "video");
    if (item.attachment_path) {
      const old = path.resolve(MEDIA_ROOT, item.attachment_path);
      await removeFileQuiet(old);
    }
    const dest = path.join(dir, `attachment${extension}`);
    await fsp.rename(session.temp_path, dest);
    db.prepare(
      `UPDATE media_items SET attachment_path = ?, attachment_name = ?, attachment_size = ?, updated_at = ? WHERE id = ?`,
    ).run(relativeMediaPath(dest), item.original_name ?? `film${extension}`, expected, now, item.id);
    db.prepare("DELETE FROM upload_sessions WHERE id = ?").run(uploadId);
    db.prepare("UPDATE galleries SET updated_at = ? WHERE id = ?").run(now, gallery.id);
    return jsonOk({ itemId: item.id, target: "attachment", size: expected });
  }

  const kind = item.kind === "video" ? "video" : "photo";
  const extension = safeExtension(item.original_name ?? (kind === "photo" ? "photo.jpg" : "film.mp4"), kind);
  const dest = path.join(dir, `original${extension}`);

  try {
    await fsp.rename(session.temp_path, dest);
  } catch (err) {
    logUploadFailure({
      studioId: user.id,
      galleryId: gallery.id,
      fileName: item.original_name,
      size: expected,
      stage: "finalize",
      detail: err instanceof Error ? err.message : "Could not move upload",
    });
    return jsonError("The file could not be finalised. Try the upload again.", 500, { offset: size });
  }

  if (kind === "photo") {
    try {
      const derivatives = await buildPhotoDerivatives(dest, dir);
      db.prepare(
        `UPDATE media_items SET status = 'ready', size_bytes = ?, mime = ?, width = ?, height = ?,
          preview_path = ?, thumb_path = ?, storage_path = ?, updated_at = ? WHERE id = ?`,
      ).run(
        expected,
        mimeForName(dest),
        derivatives.width,
        derivatives.height,
        derivatives.previewPath,
        derivatives.thumbPath,
        relativeMediaPath(dest),
        now,
        item.id,
      );
    } catch (err) {
      await removeItemFiles(gallery.id, item.id);
      db.prepare("UPDATE media_items SET status = 'failed', updated_at = ? WHERE id = ?").run(now, item.id);
      logUploadFailure({
        studioId: user.id,
        galleryId: gallery.id,
        fileName: item.original_name,
        size: expected,
        stage: "image-processing",
        detail: err instanceof Error ? err.message : "Image could not be processed",
      });
      db.prepare("DELETE FROM upload_sessions WHERE id = ?").run(uploadId);
      return jsonError("That image could not be processed. It may be corrupted or unsupported.", 422, {
        itemId: item.id,
      });
    }
  } else {
    db.prepare(
      `UPDATE media_items SET status = 'ready', size_bytes = ?, mime = ?, storage_path = ?, updated_at = ? WHERE id = ?`,
    ).run(expected, mimeForName(dest), relativeMediaPath(dest), now, item.id);
  }

  db.prepare("DELETE FROM upload_sessions WHERE id = ?").run(uploadId);
  db.prepare("UPDATE galleries SET updated_at = ? WHERE id = ?").run(now, gallery.id);

  const refreshed = get<MediaItemRow>("SELECT * FROM media_items WHERE id = ?", item.id);
  return jsonOk({
    itemId: item.id,
    mediaId: item.id,
    target: "media",
    size: expected,
    item: refreshed,
  });
}
