import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { allGalleriesForAdmin, studioSummaries } from "@/lib/data";
import { isExpired } from "@/lib/format";
import { GalleriesTable } from "@/components/admin/GalleriesTable";

export const dynamic = "force-dynamic";

export default async function AdminGalleriesPage() {
  await requireAdmin();
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  const galleries = allGalleriesForAdmin();
  const studios = studioSummaries().length;
  const live = galleries.filter((g) => g.status === "published" && !g.revoked_at && !isExpired(g.expires_at)).length;
  const featured = galleries.filter((g) => g.featured && g.status === "published" && !g.revoked_at && !isExpired(g.expires_at)).length;
  const revoked = galleries.filter((g) => g.revoked_at).length;

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-8 lg:py-10">
      <div>
        <p className="label text-gold-deep">Oversight</p>
        <h1 className="mt-2 font-serif text-[32px] leading-none text-teal-950 sm:text-[40px]">Every gallery, every link.</h1>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-ink/50">
          {galleries.length} galleries across {studios} studios — {live} live, {featured} featured, {revoked} revoked. Eligible featured galleries can appear
          publicly; other published galleries are reachable by their shared link, subject to expiry and access restrictions.
        </p>
      </div>

      <div className="mt-7">
        <GalleriesTable
          origin={origin}
          rows={galleries.map((g) => ({
            ...g,
            studio_email: g.studio_email,
            studio_status: g.studio_status,
          }))}
        />
      </div>
    </div>
  );
}
