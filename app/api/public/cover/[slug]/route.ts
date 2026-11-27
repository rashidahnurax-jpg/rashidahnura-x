import { getCurrentUser } from "@/lib/auth";
import { evaluateAccess, getGalleryBySlug } from "@/lib/access";
import { getMediaItems, resolveCoverId } from "@/lib/data";
import { isExpired } from "@/lib/format";
import { serveFile, storageAbs } from "@/lib/storage";
import { get } from "@/lib/db";
import type { MediaItemRow } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gallery = await getGalleryBySlug(slug);
  if (!gallery) return new Response("Not found", { status: 404 });

  if (gallery.revoked_at || isExpired(gallery.expires_at)) return new Response("Not found", { status: 404 });

  const viewer = await getCurrentUser();
  const access = await evaluateAccess(gallery, { viewer, preview: true });
  if (!access.browsable) return new Response("Not found", { status: 404 });

  let item: MediaItemRow | null = null;
  const coverId = resolveCoverId(gallery);
  if (coverId) {
    item = get<MediaItemRow>("SELECT * FROM media_items WHERE id = ? AND gallery_id = ? AND status = 'ready'", coverId, gallery.id) ?? null;
  }
  if (!item) {
    const items = getMediaItems(gallery.id).filter((i) => i.thumb_path || i.preview_path);
    item = items[0] ?? null;
  }
  if (!item) return new Response("Not found", { status: 404 });

  const full = new URL(req.url).searchParams.get("full") === "1";
  const abs = storageAbs(full ? item.preview_path ?? item.thumb_path : item.thumb_path ?? item.preview_path);
  if (!abs) return new Response("Not found", { status: 404 });

  return serveFile(req, {
    absolutePath: abs,
    mime: "image/webp",
    filename: `${gallery.slug}-cover.webp`,
    inline: true,
    cacheControl: "private, no-store",
  });
}
