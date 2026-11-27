import { randomUUID } from "node:crypto";
import path from "node:path";
import { db, get, nowIso, ready } from "@/lib/db";
import { evaluateAccess, getGalleryBySlug, isOwnerOrAdmin } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, readJson, sameOrigin } from "@/lib/http";
import { isExpired, slugify } from "@/lib/format";
import { fileSize, storageAbs, streamingZip, type ZipEntry } from "@/lib/storage";
import type { MediaItemRow } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  await ready();
  const { slug } = await params;
  const gallery = await getGalleryBySlug(slug);
  if (!gallery) return jsonError("Gallery not found", 404);
  if (gallery.revoked_at || isExpired(gallery.expires_at)) return jsonError("This gallery is not available.", 410);

  const viewer = await getCurrentUser();
  const owner = isOwnerOrAdmin(gallery, viewer);
  const access = owner
    ? { browsable: true, canDownload: true, email: viewer?.email ?? null, reason: "ok" as const, isOwnerPreview: true }
    : await evaluateAccess(gallery);

  if (!access.browsable) return jsonError("This gallery is not available.", access.reason === "locked" ? 403 : 410);
  if (!access.canDownload) return jsonError("Enter your email to download.", 403, { code: "email_required" });

  const body = await readJson<{ itemIds?: string[] }>(req);
  const ids = Array.isArray(body?.itemIds) ? Array.from(new Set(body.itemIds.map(String))).slice(0, 100) : [];
  if (!ids.length) return jsonError("Select at least one item.", 400);

  const entries: ZipEntry[] = [];
  let total = 0;
  for (const id of ids) {
    const item = get<MediaItemRow>(
      "SELECT * FROM media_items WHERE id = ? AND gallery_id = ? AND status = 'ready'",
      id,
      gallery.id,
    );
    if (!item) continue;
    if (item.kind === "photo" && !gallery.allow_photo_downloads) continue;
    if (item.kind !== "photo" && !gallery.allow_video_downloads) continue;
    const relative = item.kind === "youtube" ? item.attachment_path : item.storage_path;
    const abs = storageAbs(relative);
    if (!abs) continue;
    const ext = path.extname(relative ?? "") || "";
    const name =
      item.original_name ||
      item.attachment_name ||
      `${(item.title || `nurax-${entries.length + 1}`).replace(/[\\/:*?"<>|]/g, "-")}${ext}`;
    const size = fileSize(abs);
    if (!size) continue;
    entries.push({ absolutePath: abs, name, size });
    total += size;
  }

  if (!entries.length) return jsonError("None of those items can be downloaded.", 400);

  db.prepare(
    "INSERT INTO downloads (id, gallery_id, item_id, email, kind, bytes, created_at) VALUES (?, ?, NULL, ?, 'zip', ?, ?)",
  ).run(randomUUID(), gallery.id, access.email, total, nowIso());

  return streamingZip(entries, `${slugify(gallery.title) || "gallery"}-selection.zip`);
}
