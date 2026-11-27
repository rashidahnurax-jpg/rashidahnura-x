import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { requireStudio } from "@/lib/auth";
import { ownedGallery } from "@/lib/studio";
import { managerPayload } from "@/lib/manager";
import { GalleryManager } from "@/components/studio/manager/GalleryManager";

export const dynamic = "force-dynamic";

export default async function GalleryManagerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStudio();
  const { id } = await params;
  const gallery = ownedGallery(id, user.id);
  if (!gallery) notFound();

  const initial = managerPayload(gallery, user);
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  return <GalleryManager initial={initial} origin={origin} />;
}
