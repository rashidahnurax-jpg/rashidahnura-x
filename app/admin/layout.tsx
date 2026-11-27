import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { StudioSignOut } from "@/components/studio/StudioSignOut";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const initials = admin.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-dvh bg-cream-soft lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-cream/10 bg-teal-950 px-6 py-7 text-cream lg:flex">
        <Logo href="/admin" light compact />
        <p className="mt-2 pl-[52px] text-[8px] font-semibold uppercase tracking-[0.28em] text-gold">Admin console</p>

        <div className="mt-10">
          <p className="px-1 text-[9px] font-semibold uppercase tracking-[0.24em] text-cream/30">Oversight</p>
          <div className="mt-3">
            <AdminNav />
          </div>
        </div>

        <div className="mt-8 rounded-sm border border-cream/10 bg-cream/[0.04] p-3.5">
          <p className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-cream/40">
            <ShieldCheck className="h-3.5 w-3.5 text-turquoise" /> Platform control
          </p>
          <p className="mt-2 text-[10.5px] leading-relaxed text-cream/45">
            Studio access, storage and link revocation stay in this console.
          </p>
        </div>

        <div className="mt-auto space-y-4">
          <div className="rounded-sm border border-cream/10 bg-cream/[0.04] p-3.5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/15 font-serif text-[12px] text-gold-light">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-cream">{admin.name}</p>
                <p className="truncate text-[10px] text-cream/40">{admin.email}</p>
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
          <Logo href="/admin" compact />
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-gold/40 bg-cream px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-gold-deep">
              Admin
            </span>
            <StudioSignOut compact />
          </div>
        </header>
        {children}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-teal-900/10 bg-cream-soft/95 backdrop-blur lg:hidden">
        <AdminNav mobile />
      </nav>
    </div>
  );
}
