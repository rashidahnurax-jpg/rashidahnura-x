import Link from "next/link";
import { headers } from "next/headers";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Clock,
  Download,
  Eye,
  FolderOpen,
  HardDrive,
  Heart,
  Image as ImageIcon,
  ShieldCheck,
  UploadCloud,
  Users,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { adminTotals, studioSummaries, allGalleriesForAdmin } from "@/lib/data";
import { adminFailures, adminSelections, adminDownloads } from "@/lib/admin";
import { InviteStudioButton } from "@/components/admin/InviteStudioButton";
import { formatBytes, timeAgo, cn, isExpired } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  await requireAdmin();
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  const totals = adminTotals();
  const studios = studioSummaries();
  const failures = adminFailures(6);
  const selections = adminSelections(6);
  const downloads = adminDownloads(6);
  const galleries = allGalleriesForAdmin();
  const published = galleries.filter((g) => g.status === "published" && !g.revoked_at).length;
  const featured = galleries
    .filter((g) => g.featured && g.status === "published" && !g.revoked_at && !isExpired(g.expires_at))
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))
    .slice(0, 3);
  const limits = studios.reduce((sum, s) => sum + Number(s.user.storage_limit_bytes ?? 0), 0);
  const storagePct = Math.min(100, Math.round((totals.storage / Math.max(limits, 1)) * 100));
  const activeStudios = studios.filter((s) => s.user.status === "active");

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-8 lg:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label text-gold-deep">Oversight</p>
          <h1 className="mt-2 font-serif text-[32px] leading-none text-teal-950 sm:text-[40px]">The platform, at a glance.</h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-ink/50">
            Studio access, storage and every shared link — real totals from the archive itself.
          </p>
        </div>
        <InviteStudioButton origin={origin} />
      </div>

      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={<Users className="h-4 w-4" />}
          label="Studio clients"
          value={studios.length}
          detail={`${totals.invited} pending · ${totals.suspended} suspended`}
          href="/admin/studios"
        />
        <Stat
          icon={<FolderOpen className="h-4 w-4" />}
          label="Galleries"
          value={totals.galleries}
          detail={`${published} published, not revoked`}
          href="/admin/galleries"
        />
        <Stat
          icon={<ImageIcon className="h-4 w-4" />}
          label="Media preserved"
          value={totals.items}
          detail={`${totals.selections} client selections`}
          href="/admin/galleries"
        />
        <Stat
          icon={<Download className="h-4 w-4" />}
          label="Guest downloads"
          value={totals.downloads}
          detail={`${totals.views.toLocaleString("en-GB")} gallery views`}
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className="rounded-sm border border-cream/10 bg-teal-950 p-5 text-cream lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-cream/40">
                <HardDrive className="h-3.5 w-3.5 text-turquoise" /> Platform storage
              </p>
              <p className="mt-2 font-serif text-[26px] leading-none">
                {formatBytes(totals.storage)}
                <span className="ml-2 text-[12px] font-sans text-cream/40">of {formatBytes(limits)} allocated</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-[0.16em] text-cream/35">In flight</p>
              <p className="mt-1 text-[13px] text-turquoise">{formatBytes(totals.pending)}</p>
            </div>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-cream/10">
            <div className="h-full rounded-full bg-turquoise" style={{ width: `${storagePct}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[10px] text-cream/40">
            <span className="flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-gold" /> {totals.failures} failed uploads on record</span>
            <span className="flex items-center gap-1.5"><Heart className="h-3 w-3 text-turquoise" /> {totals.selections} selections submitted</span>
            <span className="flex items-center gap-1.5"><Eye className="h-3 w-3 text-turquoise" /> {totals.downloads} downloads served</span>
          </div>
        </div>
        <div className="rounded-sm border border-teal-900/10 bg-white p-5">
          <p className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-teal-900/40">
            <ShieldCheck className="h-3.5 w-3.5 text-gold-deep" /> Client health
          </p>
          <div className="mt-3 space-y-2.5">
            <MiniRow label="Active studios" value={`${activeStudios.length} of ${studios.length}`} />
            <MiniRow label="Awaiting acceptance" value={String(totals.invited)} />
            <MiniRow label="Suspended" value={String(totals.suspended)} />
            <MiniRow label="Published, not revoked" value={String(published)} />
          </div>
          <Link href="/admin/studios" className="mt-4 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-900/60 hover:text-teal-900">
            Manage studios <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <SectionHead title="Studio clients" action={{ href: "/admin/studios", label: "All studios" }} />
          <div className="mt-3 space-y-2">
            {studios.length === 0 && (
              <div className="rounded-sm border border-dashed border-teal-900/15 bg-white py-12 text-center text-[12px] text-ink/40">
                No studio clients yet. Send the first invitation.
              </div>
            )}
            {studios.slice(0, 6).map((studio) => {
              const pct = Math.min(100, Math.round((studio.storage_used / Math.max(Number(studio.user.storage_limit_bytes), 1)) * 100));
              return (
                <div key={studio.user.id} className="flex flex-wrap items-center gap-3 rounded-sm border border-teal-900/10 bg-white px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream font-serif text-[12px] text-teal-900">
                    {studio.user.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-serif text-[16px] leading-tight text-teal-950">{studio.user.name}</p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em]",
                          studio.user.status === "active" && "bg-turquoise/20 text-teal-900",
                          studio.user.status === "invited" && "bg-gold/15 text-gold-deep",
                          studio.user.status === "suspended" && "bg-red-800/10 text-red-800",
                        )}
                      >
                        {studio.user.status === "invited" ? "Pending" : studio.user.status}
                      </span>
                    </div>
                    <p className="truncate text-[10px] text-ink/40">
                      {studio.user.email} · {studio.gallery_count} galleries · {studio.item_count} items
                    </p>
                  </div>
                  <div className="w-28 shrink-0">
                    <div className="flex items-center justify-between text-[8.5px] text-teal-900/40">
                      <span>{formatBytes(studio.storage_used)}</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-teal-900/10">
                      <div className={cn("h-full rounded-full", pct > 90 ? "bg-red-700" : "bg-turquoise-deep")} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <SectionHead title="Upload health" action={{ href: "/admin/studios", label: "Studios" }} />
          <div className="mt-3 rounded-sm border border-teal-900/10 bg-white">
            {failures.length === 0 ? (
              <p className="flex items-center gap-2 px-4 py-6 text-[11.5px] text-ink/40">
                <UploadCloud className="h-4 w-4 text-turquoise-deep" /> No failed uploads on record.
              </p>
            ) : (
              failures.map((f) => (
                <div key={f.id} className="border-b border-teal-900/[0.07] px-4 py-3 last:border-b-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-[11.5px] font-semibold text-teal-950">{f.file_name ?? "Unnamed file"}</p>
                    <span className="shrink-0 rounded-sm bg-red-50 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-red-800">{f.stage}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[9.5px] text-ink/40">
                    {f.studio_name} · {f.size_bytes ? formatBytes(f.size_bytes) : "size unknown"} · {timeAgo(f.created_at)}
                  </p>
                  {f.detail && <p className="mt-1 truncate text-[9px] text-ink/30" title={f.detail}>{f.detail}</p>}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <SectionHead title="Client selections" action={{ href: "/admin/galleries", label: "Galleries" }} />
          <div className="mt-3 rounded-sm border border-teal-900/10 bg-white">
            {selections.length === 0 ? (
              <p className="px-4 py-6 text-[11.5px] text-ink/40">No selections submitted yet.</p>
            ) : (
              selections.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 border-b border-teal-900/[0.07] px-4 py-3 last:border-b-0">
                  <div className="min-w-0">
                    <Link href={`/g/${s.gallery_slug}`} className="truncate text-[12px] font-semibold text-teal-950 hover:text-turquoise-deep">
                      {s.gallery_title}
                    </Link>
                    <p className="truncate text-[9.5px] text-ink/40">
                      {s.email ?? "Anonymous guest"} · {timeAgo(s.created_at)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-teal-900/15 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-teal-900/55">
                    {s.item_count} {s.item_count === 1 ? "picture" : "pictures"}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <SectionHead title="Recent downloads" action={{ href: "/admin/galleries", label: "Galleries" }} />
          <div className="mt-3 rounded-sm border border-teal-900/10 bg-white">
            {downloads.length === 0 ? (
              <p className="px-4 py-6 text-[11.5px] text-ink/40">No downloads yet.</p>
            ) : (
              downloads.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 border-b border-teal-900/[0.07] px-4 py-3 last:border-b-0">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold text-teal-950">{d.gallery_title}</p>
                    <p className="truncate text-[9.5px] text-ink/40">
                      {d.email ?? "Anonymous guest"} · {timeAgo(d.created_at)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="rounded-full bg-teal-900/[0.05] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-teal-900/50">{d.kind}</span>
                    <p className="mt-0.5 text-[9px] text-ink/35">{(d.bytes / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="mt-8">
        <SectionHead title="Featured on the homepage" action={{ href: "/admin/galleries", label: "Feature galleries" }} />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featured.length === 0 ? (
            <div className="rounded-sm border border-dashed border-teal-900/15 bg-white p-6 text-[11.5px] text-ink/40 sm:col-span-2 lg:col-span-3">
              Nothing eligible is featured yet. Only featured, published, unexpired and non-revoked galleries appear in the public archive.
            </div>
          ) : (
            featured.map((g) => (
              <Link
                key={g.id}
                href={`/g/${g.slug}`}
                className="group flex items-center gap-3 rounded-sm border border-teal-900/10 bg-white p-3 transition hover:border-teal-900/25"
              >
                <div className="h-16 w-14 shrink-0 overflow-hidden rounded-sm bg-teal-900/5">
                  {g.cover_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.cover_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-[15px] leading-tight text-teal-950">{g.title}</p>
                  <p className="truncate text-[9.5px] text-ink/40">{g.studio_name}</p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-teal-900/35">
                    {g.photo_count} photos · {g.video_count} films · <Clock className="mb-0.5 inline h-2.5 w-2.5" /> {timeAgo(g.updated_at)}
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-teal-900/25 transition group-hover:text-turquoise-deep" />
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  detail,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-teal-900/10 bg-cream text-teal-900/60">{icon}</span>
        {href && <ArrowUpRight className="h-3.5 w-3.5 text-teal-900/20 transition group-hover:text-turquoise-deep" />}
      </div>
      <p className="mt-3 font-serif text-[26px] leading-none text-teal-950">{value.toLocaleString("en-GB")}</p>
      <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-teal-900/35">{label}</p>
      <p className="mt-0.5 text-[10px] text-ink/40">{detail}</p>
    </>
  );
  return href ? (
    <Link href={href} className="group rounded-sm border border-teal-900/10 bg-white p-4 transition hover:border-teal-900/25">
      {inner}
    </Link>
  ) : (
    <div className="rounded-sm border border-teal-900/10 bg-white p-4">{inner}</div>
  );
}

function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-teal-900/[0.07] pb-2 text-[11px] last:border-b-0 last:pb-0">
      <span className="text-ink/50">{label}</span>
      <span className="font-semibold text-teal-950">{value}</span>
    </div>
  );
}

function SectionHead({ title, action }: { title: string; action?: { href: string; label: string } }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-serif text-[20px] leading-none text-teal-950">{title}</h2>
      {action && (
        <Link href={action.href} className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-teal-900/45 hover:text-teal-900">
          {action.label} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
