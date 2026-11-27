import { db, ready } from "@/lib/db";
import { studioUser } from "@/lib/studio";
import { jsonError, jsonOk, sameOrigin } from "@/lib/http";
import { logUploadFailure, ownedSession } from "@/lib/uploads";
import { removeItemFiles, tempFile } from "@/lib/storage";
import fs from "node:fs";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ uploadId: string }> }) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  await ready();
  const user = await studioUser();
  if (!user) return jsonError("Not authorised", 403);
  const { uploadId } = await params;
  const owned = ownedSession(uploadId, user.id);
  if (!owned) return jsonError("Upload session not found.", 404);

  const { session, item, gallery } = owned;
  logUploadFailure({
    studioId: user.id,
    galleryId: gallery.id,
    fileName: item.original_name,
    size: Number(session.expected_size),
    stage: "client-abandoned",
    detail: "Upload was abandoned before completion.",
  });

  try {
    fs.rmSync(session.temp_path, { force: true });
  } catch {
    // ignore
  }
  db.prepare("DELETE FROM upload_sessions WHERE id = ?").run(uploadId);

  if (session.target === "media") {
    await removeItemFiles(gallery.id, item.id);
    db.prepare("DELETE FROM media_items WHERE id = ? AND status = 'uploading'").run(item.id);
    try {
      fs.rmSync(tempFile(item.id), { force: true });
    } catch {
      // ignore
    }
  }

  return jsonOk();
}
