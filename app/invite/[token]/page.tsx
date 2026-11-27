import Link from "next/link";
import { ArrowLeft, CalendarDays, ShieldCheck } from "lucide-react";
import { ready, get } from "@/lib/db";
import type { UserRow } from "@/lib/types";
import { InviteForm } from "@/components/auth/InviteForm";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Accept your invitation" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  await ready();
  const { token } = await params;
  const user = get<UserRow>(
    "SELECT * FROM users WHERE invite_token = ? AND role = 'studio' AND status = 'invited'",
    token,
  );
  const expired = user?.invite_expires_at ? new Date(user.invite_expires_at).getTime() < Date.now() : false;
  const valid = Boolean(user) && !expired;

  return (
    <div className="grid min-h-dvh bg-cream-soft lg:grid-cols-[0.95fr_1.05fr]">
      <aside className="relative hidden overflow-hidden bg-teal-950 px-12 py-12 text-cream lg:flex lg:flex-col xl:px-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 bottom-10 h-[400px] w-[400px] rounded-full bg-turquoise/10 blur-[110px]" />
        </div>
        <Link href="/" className="relative flex items-center gap-3">
          <img src="/brand/nurax-logo-320.png" alt="NURA-X" width={320} height={320} className="h-11 w-11 rounded-full object-contain" />
          <span className="text-[13px] font-bold tracking-[0.32em] text-cream">NURA-X</span>
        </Link>

        <div className="relative my-auto py-14">
          <p className="label text-gold">An invitation</p>
          <h1 className="mt-5 max-w-md font-serif text-5xl leading-[0.98] xl:text-6xl">
            A studio of <em className="italic text-turquoise">your own.</em>
          </h1>
          <p className="mt-6 max-w-sm text-[14px] leading-relaxed text-cream/60">
            Create galleries, arrange chapters, upload originals and share one link — with permissions that
            stay under your hand.
          </p>
          <div className="mt-10 space-y-4 border-t border-cream/10 pt-7 text-[12.5px] text-cream/60">
            <p className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-gold" /> Private drafts until you publish</p>
            <p className="flex items-center gap-3"><CalendarDays className="h-4 w-4 text-gold" /> Expiry dates and link revocation</p>
          </div>
        </div>

        <p className="relative text-[9px] uppercase tracking-[0.24em] text-cream/30">Intentional Intelligence</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-[440px]">
          <Link href="/" className="mb-9 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-teal-900/50 lg:hidden">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to NURA-X
          </Link>

          {valid && user ? (
            <>
              <p className="label text-gold-deep">Invited studio</p>
              <h2 className="mt-3 font-serif text-4xl leading-tight text-teal-950">
                Welcome, {user.name.split(" ")[0]}.
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-ink/55">
                Set a password to activate the workspace for <strong className="font-semibold text-ink/75">{user.email}</strong>.
                {user.invite_expires_at && (
                  <span className="mt-1 block text-[11px] text-ink/40">Invitation expires {formatDate(user.invite_expires_at)}.</span>
                )}
              </p>
              <InviteForm token={token} initialName={user.name} email={user.email} />
            </>
          ) : (
            <>
              <p className="label text-gold-deep">Invitation unavailable</p>
              <h2 className="mt-3 font-serif text-4xl leading-tight text-teal-950">
                This invitation {expired ? "has expired" : "is no longer valid"}.
              </h2>
              <p className="mt-3 text-[13px] leading-relaxed text-ink/55">
                Ask the NURA-X administrator to send a fresh invitation. If you already accepted, sign in with your
                email and password instead.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signin" className="btn-primary">Go to sign in</Link>
                <Link href="/" className="btn-outline">Return home</Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
