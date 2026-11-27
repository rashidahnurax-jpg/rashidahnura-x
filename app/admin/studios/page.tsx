import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { studioSummaries } from "@/lib/data";
import { InviteStudioButton } from "@/components/admin/InviteStudioButton";
import { StudioAdminCard, type AdminStudio } from "@/components/admin/StudioAdminCard";
import { formatBytes } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminStudiosPage() {
  await requireAdmin();
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  const studios: AdminStudio[] = studioSummaries().map((summary) => ({
    id: summary.user.id,
    name: summary.user.name,
    email: summary.user.email,
    status: summary.user.status,
    storage_limit_bytes: Number(summary.user.storage_limit_bytes ?? 0),
    invite_token: summary.user.invite_token,
    invite_expires_at: summary.user.invite_expires_at,
    created_at: summary.user.created_at,
    last_seen_at: summary.user.last_seen_at,
    gallery_count: summary.gallery_count,
    published_count: summary.published_count,
    item_count: summary.item_count,
    storage_used: summary.storage_used,
  }));

  const pending = studios.filter((s) => s.status === "invited");
  const active = studios.filter((s) => s.status === "active");
  const suspended = studios.filter((s) => s.status === "suspended");
  const totalStorage = studios.reduce((sum, s) => sum + s.storage_used, 0);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-8 lg:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label text-gold-deep">Studio clients</p>
          <h1 className="mt-2 font-serif text-[32px] leading-none text-teal-950 sm:text-[40px]">Invitations &amp; access.</h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-ink/50">
            {active.length} active · {pending.length} pending · {suspended.length} suspended — {formatBytes(totalStorage)} used or reserved for client media.
          </p>
        </div>
        <InviteStudioButton origin={origin} />
      </div>

      <section className="mt-8">
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-[21px] leading-none text-teal-950">Active studios</h2>
          <span className="rounded-full bg-teal-900/[0.06] px-2 py-0.5 text-[9px] font-semibold text-teal-900/50">{active.length}</span>
        </div>
        {active.length === 0 ? (
          <div className="mt-3 rounded-sm border border-dashed border-teal-900/15 bg-white py-14 text-center text-[12px] text-ink/40">
            No active studios yet.
          </div>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {active.map((studio) => (
              <StudioAdminCard key={studio.id} studio={studio} origin={origin} />
            ))}
          </div>
        )}
      </section>

      {pending.length > 0 && (
        <section className="mt-9">
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-[21px] leading-none text-teal-950">Pending invitations</h2>
            <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[9px] font-semibold text-gold-deep">{pending.length}</span>
          </div>
          <p className="mt-1 text-[11.5px] text-ink/40">Email delivery is not connected. Copy each private link and send it directly.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pending.map((studio) => (
              <StudioAdminCard key={studio.id} studio={studio} origin={origin} />
            ))}
          </div>
        </section>
      )}

      {suspended.length > 0 && (
        <section className="mt-9">
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-[21px] leading-none text-teal-950">Suspended</h2>
            <span className="rounded-full bg-red-800/10 px-2 py-0.5 text-[9px] font-semibold text-red-800">{suspended.length}</span>
          </div>
          <p className="mt-1 text-[11.5px] text-ink/40">Suspended studios cannot sign in. Published gallery links remain accessible unless expired or revoked.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {suspended.map((studio) => (
              <StudioAdminCard key={studio.id} studio={studio} origin={origin} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
