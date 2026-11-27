import { randomUUID } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { db, get, nowIso, ready } from "@/lib/db";
import { studioUser } from "@/lib/studio";
import { jsonError, jsonOk, sameOrigin } from "@/lib/http";
import { TEMP_ROOT } from "@/lib/config";
import { buildPosterDerivatives, itemDir } from "@/lib/storage";
import type { GalleryRow, MediaItemRow } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  await ready();
  const user = await studioUser();
  if (!user) return jsonError("Not authorised", 403);
  const { id } = await params;

  const item = get<MediaItemRow>("SELECT * FROM media_items WHERE id = ?", id);
  if (!item) return jsonError("Item not found", 404);
  const gallery = get<GalleryRow>("SELECT * FROM galleries WHERE id = ? AND studio_id = ?", item.gallery_id, user.id);
  if (!gallery) return jsonError("Item not found", 404);
  if (item.kind !== "video") return jsonError("Posters are only available for uploaded films.", 400);

  const buffer = Buffer.from(await req.arrayBuffer());
  if (!buffer.length) return jsonError("Poster image is empty.", 400);
  if (buffer.length > 10 * 1024 * 1024) return jsonError("Poster is too large.", 413);

  fs.mkdirSync(TEMP_ROOT, { recursive: true });
  const temp = path.join(TEMP_ROOT, `poster-${randomUUID()}.jpg`);
  await fsp.writeFile(temp, buffer);

  try {
    const dir = itemDir(gallery.id, item.id);
    const posterPath = await buildPosterDerivatives(temp, dir);
    db.prepare("UPDATE media_items SET poster_path = ?, updated_at = ? WHERE id = ?").run(
      posterPath,
      nowIso(),
      item.id,
    );
    return jsonOk({ posterPath });
  } catch {
    return jsonError("That poster image could not be processed.", 422);
  } finally {
    await fsp.rm(temp, { force: true });
  }
}
