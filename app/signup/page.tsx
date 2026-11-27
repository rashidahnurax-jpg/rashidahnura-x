import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check, Lock, Mail, KeyRound, Link2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Create a studio account" };

const MODES = [
  { icon: Link2, text: "Open links for immediate access" },
  { icon: Mail, text: "Email gates before a first download" },
  { icon: KeyRound, text: "Invite-only unlock with one-time codes" },
  { icon: Lock, text: "Shared passwords per gallery" },
];

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/studio");

  return (
    <div className="grid min-h-dvh bg-cream-soft lg:grid-cols-[1.02fr_0.98fr]">
      <aside className="relative hidden overflow-hidden bg-teal-950 px-12 py-12 text-cream lg:flex lg:flex-col xl:px-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-1/4 h-[420px] w-[420px] rounded-full bg-turquoise/10 blur-[100px]" />
          <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-gold/10 blur-[90px]" />
        </div>
        <div className="relative flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/brand/nurax-logo-320.png" alt="NURA-X" width={320} height={320} className="h-11 w-11 rounded-full object-contain" />
            <span className="text-[13px] font-bold tracking-[0.32em] text-cream">NURA-X</span>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-cream/45 transition hover:text-cream">
            <ArrowLeft className="h-3.5 w-3.5" /> Public site
          </Link>
        </div>
        <div className="relative my-auto max-w-lg py-16">
          <p className="label text-gold">Your studio workspace</p>
          <h1 className="mt-5 font-serif text-5xl leading-[0.98] xl:text-6xl">
            Your work, held <em className="italic text-turquoise">with intention.</em>
          </h1>
          <p className="mt-6 text-[14px] leading-relaxed text-cream/60">
            Build a considered home for your photographs and films. Start private, then share a gallery on your terms.
          </p>
          <div className="mt-10 space-y-3 border-t border-cream/10 pt-7">
            {MODES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-[12.5px] text-cream/65">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-cream/15">
                  <Icon className="h-3.5 w-3.5 text-gold" strokeWidth={1.8} />
                </span>
                {text}
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex items-center gap-2 text-[9px] uppercase tracking-[0.24em] text-cream/35">
          <Check className="h-3.5 w-3.5 text-turquoise" /> Admin access is never self-assigned
        </div>
      </aside>

      <main className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-10 flex items-center justify-between lg:hidden">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/brand/nurax-logo-320.png" alt="NURA-X" width={320} height={320} className="h-9 w-9 rounded-full object-contain" />
              <span className="text-[11px] font-bold tracking-[0.28em] text-teal-950">NURA-X</span>
            </Link>
            <Link href="/" className="text-[10px] uppercase tracking-[0.18em] text-teal-900/50">Public site</Link>
          </div>
          <p className="label text-gold-deep">A considered beginning</p>
          <h2 className="mt-3 font-serif text-4xl leading-tight text-teal-950">Create your studio account</h2>
          <p className="mt-2 text-[13px] text-ink/55">
            Start with a private workspace. You can publish galleries whenever they are ready.
          </p>
          <SignUpForm />
          <p className="mt-8 text-center text-[10px] uppercase tracking-[0.2em] text-teal-900/35">
            Intentional Intelligence
          </p>
        </div>
      </main>
    </div>
  );
}
