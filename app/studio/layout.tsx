import Link from "next/link";
import { ArrowUpRight, FolderOpen, Globe2, Plus } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { StudioSignOut } from "@/components/studio/StudioSignOut";
import { requireStudio } from "@/lib/auth";
import { quotaFor } from "@/lib/uploads";
import { formatBytes } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStudio();
  const quota = quotaFor(user);
  const pct = Math.min(100, Math.round((quota.used / Math.max(quota.limit, 1)) * 100));
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-dvh bg-cream-soft lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-cream/10 bg-teal-950 px-6 py-7 text-cream lg:flex">
        <Logo href="/studio" light compact />

        <div className="mt-10">
          <p className="px-1 text-[9px] font-semibold uppercase tracking-[0.24em] text-cream/30">Workspace</p>
          <nav className="mt-3 space-y-1">
            <Link
              href="/studio"
              className="flex items-center gap-3 rounded-sm bg-cream/[0.07] px-3 py-2.5 text-[12.5px] font-medium text-cream"
            >
              <FolderOpen className="h-4 w-4 text-turquoise" strokeWidth={1.7} />
              Overview
            </Link>
            <Link
              href="/galleries"
              className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-[12.5px] text-cream/55 transition hover:bg-cream/5 hover:text-cream"
            >
              <Globe2 className="h-4 w-4 text-gold" strokeWidth={1.7} />
              Public archive
            </Link>
          </nav>
        </div>

        <div className="mt-8 border-t border-cream/10 pt-6">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-cream/35">Storage</p>
            <span className="font-serif text-[11px] text-cream/60">{pct}%</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-cream/10">
            <div className="h-full rounded-full bg-turquoise" style={{ width: `${Math.max(pct, 1)}%` }} />
          </div>
          <p className="mt-2.5 text-[10.5px] text-cream/40">
            {formatBytes(quota.used)} of {formatBytes(quota.limit)}
            {quota.pending > 0 && <span className="text-gold/80"> · {formatBytes(quota.pending)} uploading</span>}
          </p>
        </div>

        <div className="mt-auto space-y-4">
          <Link
            href="/studio#new"
            className="flex items-center justify-center gap-2 rounded-sm border border-cream/20 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cream/70 transition hover:border-turquoise/60 hover:text-cream"
          >
            <Plus className="h-3.5 w-3.5" /> New gallery
          </Link>

          <div className="rounded-sm border border-cream/10 bg-cream/[0.04] p-3.5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-turquoise/15 font-serif text-[12px] text-turquoise">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-cream">{user.name}</p>
                <p className="truncate text-[10px] text-cream/40">{user.email}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-cream/10 pt-3">
              <StudioSignOut />
              <Link href="/" className="flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-cream/35 hover:text-cream/70">
                Site <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 pb-20 lg:pb-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-teal-900/10 bg-cream-soft/95 px-5 py-3 backdrop-blur lg:hidden">
          <Logo href="/studio" compact />
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-teal-900/10 bg-cream font-serif text-[11px] text-teal-900">
              {initials}
            </span>
            <StudioSignOut compact />
          </div>
        </header>
        {children}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-teal-900/10 bg-cream-soft/95 backdrop-blur lg:hidden" aria-label="Studio">
        <Link href="/studio" className="flex flex-col items-center gap-1 py-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-teal-900/60">
          <FolderOpen className="h-4 w-4" /> Galleries
        </Link>
        <Link href="/galleries" className="flex flex-col items-center gap-1 py-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-teal-900/60">
          <Globe2 className="h-4 w-4" /> Public site
        </Link>
      </nav>
    </div>
  );
}
