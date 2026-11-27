import { randomUUID } from "node:crypto";
import { db, get, nowIso, ready } from "@/lib/db";
import { evaluateAccess, getGalleryBySlug, isOwnerOrAdmin } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { isExpired } from "@/lib/format";
import { bundledAssetUrl, mimeForName, serveBundledAsset, serveFile, storageAbs } from "@/lib/storage";
import type { MediaItemRow } from "@/lib/types";

export const runtime = "nodejs";

const VARIANTS = new Set(["thumb", "preview", "poster", "file"]);

function deny(status: number, reason: string): Response {
  return new Response(JSON.stringify({ ok: false, error: reason }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-NURA-X-Reason": reason },
  });
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string; itemId: string; variant: string }> }) {
  await ready();
  const { slug, itemId, variant } = await params;
  if (!VARIANTS.has(variant)) return deny(404, "not_found");

  const gallery = await getGalleryBySlug(slug);
  if (!gallery) return deny(404, "not_found");
  if (gallery.revoked_at) return deny(410, "revoked");
  if (isExpired(gallery.expires_at)) return deny(410, "expired");

  const viewer = await getCurrentUser();
  const owner = isOwnerOrAdmin(gallery, viewer);
  const access = owner
    ? {
        browsable: true,
        canDownload: true,
        email: viewer?.email ?? null,
        isOwnerPreview: true,
        reason: "ok" as const,
      }
    : await evaluateAccess(gallery);

  if (!access.browsable) {
    const status = access.reason === "locked" ? 403 : access.reason === "unpublished" ? 404 : 410;
    return deny(status, access.reason);
  }

  const item = get<MediaItemRow>(
    "SELECT * FROM media_items WHERE id = ? AND gallery_id = ? AND status = 'ready'",
    itemId,
    gallery.id,
  );
  if (!item) return deny(404, "not_found");

  const url = new URL(req.url);
  const inlineRequested = url.searchParams.get("inline") === "1";

  if (variant !== "file") {
    const relative =
      variant === "thumb" ? item.thumb_path : variant === "preview" ? item.preview_path : item.poster_path;
    if (bundledAssetUrl(relative)) {
      return serveBundledAsset(req, relative!, {
        mime: mimeForName(relative!),
        filename: relative!.split("/").pop() ?? `${gallery.slug}-${variant}`,
        inline: true,
        cacheControl: "private, no-store",
      });
    }
    const abs = storageAbs(relative);
    if (!abs) return deny(404, "not_found");
    return serveFile(req, {
      absolutePath: abs,
      mime: mimeForName(abs),
      filename: relative?.split("/").pop() ?? `${gallery.slug}-${variant}`,
      inline: true,
      cacheControl: "private, no-store",
    });
  }

  const isVideo = item.kind === "video" || item.kind === "youtube";
  const inline = inlineRequested && isVideo;

  if (!inline) {
    if (!access.canDownload) return deny(403, "email_required");
    const allowed =
      item.kind === "photo" ? Boolean(gallery.allow_photo_downloads) : Boolean(gallery.allow_video_downloads);
    if (!allowed) return deny(403, "downloads_disabled");
  }

  const relative = item.kind === "youtube" ? item.attachment_path : item.storage_path;
  const ext = relative?.match(/\.[a-z0-9]{1,8}$/i)?.[0] ?? "";
  const downloadName =
    item.original_name || item.attachment_name || `${(item.title || "film").replace(/[\\/:*?"<>|]/g, "-")}${ext}`;
  const recordDownload = () => {
    db.prepare(
      "INSERT INTO downloads (id, gallery_id, item_id, email, kind, bytes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(
      randomUUID(),
      gallery.id,
      item.id,
      access.email,
      item.kind === "photo" ? "photo" : "video",
      Number(item.size_bytes ?? item.attachment_size ?? 0),
      nowIso(),
    );
  };

  if (bundledAssetUrl(relative)) {
    const response = await serveBundledAsset(req, relative!, {
      mime: item.mime || mimeForName(relative!),
      filename: downloadName,
      inline,
      cacheControl: "private, no-store",
    });
    if (!inline && response.ok) recordDownload();
    return response;
  }
  const abs = storageAbs(relative);
  if (!abs) return deny(404, "no_original");

  if (!inline) recordDownload();

  return serveFile(req, {
    absolutePath: abs,
    mime: item.mime || mimeForName(downloadName),
    filename: downloadName,
    inline,
    cacheControl: "private, no-store",
  });
}
