import { redirect } from "next/navigation";
import { ready, get } from "@/lib/db";
import type { GalleryRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FlagshipPage() {
  await ready();
  const flagship = get<GalleryRow>(
    "SELECT * FROM galleries WHERE kind = 'flagship' AND status = 'published' AND revoked_at IS NULL ORDER BY created_at ASC LIMIT 1",
  );
  if (!flagship) redirect("/galleries");
  redirect(`/g/${flagship.slug}`);
}
