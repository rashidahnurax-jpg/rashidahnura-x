import fs from "node:fs";
import fsp from "node:fs/promises";
import { db, ready } from "@/lib/db";
import { studioUser } from "@/lib/studio";
import { jsonError, jsonOk, sameOrigin } from "@/lib/http";
import { logUploadFailure, ownedSession } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ uploadId: string }> }) {
  await ready();
  const user = await studioUser();
  if (!user) return jsonError("Not authorised", 403);
  const { uploadId } = await params;
  const owned = ownedSession(uploadId, user.id);
  if (!owned) return jsonError("Upload session not found. Start the upload again.", 404, { expired: true });

  let size = Number(owned.session.received_bytes);
  try {
    size = fs.statSync(owned.session.temp_path).size;
  } catch {
    size = 0;
  }

  return jsonOk({
    uploadId,
    mediaId: owned.session.media_id,
    offset: size,
    expected: Number(owned.session.expected_size),
    target: owned.session.target,
    fileName: owned.item.original_name,
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ uploadId: string }> }) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  await ready();
  const user = await studioUser();
  if (!user) return jsonError("Not authorised", 403);
  const { uploadId } = await params;
  const owned = ownedSession(uploadId, user.id);
  if (!owned) return jsonError("Upload session not found. Start the upload again.", 404, { expired: true });

  const url = new URL(req.url);
  const requestedOffset = url.searchParams.get("offset");
  let current = 0;
  try {
    current = fs.statSync(owned.session.temp_path).size;
  } catch {
    return jsonError("Upload file is missing. Start again.", 410, { expired: true });
  }

  if (requestedOffset !== null && Number(requestedOffset) !== current) {
    return jsonError("Offset mismatch — resume from the reported offset.", 409, { offset: current });
  }

  let chunk: Buffer;
  try {
    chunk = Buffer.from(await req.arrayBuffer());
  } catch {
    return jsonError("The chunk could not be read. Try again.", 400);
  }
  if (!chunk.length) return jsonError("Empty chunk.", 400);

  const expected = Number(owned.session.expected_size);
  if (current + chunk.length > expected) {
    logUploadFailure({
      studioId: user.id,
      galleryId: owned.gallery.id,
      fileName: owned.item.original_name,
      size: expected,
      stage: "chunk",
      detail: "Received more bytes than declared.",
    });
    return jsonError("This upload is larger than declared.", 413);
  }

  try {
    await fsp.appendFile(owned.session.temp_path, chunk);
  } catch (err) {
    logUploadFailure({
      studioId: user.id,
      galleryId: owned.gallery.id,
      fileName: owned.item.original_name,
      size: expected,
      stage: "chunk",
      detail: err instanceof Error ? err.message : "Write failed",
    });
    return jsonError("The chunk could not be written. Try again.", 500, { offset: current });
  }

  const next = current + chunk.length;
  db.prepare("UPDATE upload_sessions SET received_bytes = ? WHERE id = ?").run(next, uploadId);
  return jsonOk({ offset: next, expected });
}
