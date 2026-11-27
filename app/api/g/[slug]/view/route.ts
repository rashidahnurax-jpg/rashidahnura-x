import { NextResponse } from "next/server";
import { evaluateAccess, getGalleryBySlug, recordView } from "@/lib/access";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gallery = await getGalleryBySlug(slug);
  if (!gallery) return new NextResponse(null, { status: 204 });
  const access = await evaluateAccess(gallery);
  if (access.browsable && !access.isOwnerPreview) recordView(gallery.id);
  return new NextResponse(null, { status: 204 });
}
