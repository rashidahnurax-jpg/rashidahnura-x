"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { apiError } from "@/components/studio/manager/ManagerTypes";

export interface LockedGallery {
  slug: string;
  title: string;
  subtitle: string | null;
  cover_url: string | null;
  studio_name: string;
  access_mode: "password" | "invite";
}

export function AccessGate({ gallery }: { gallery: LockedGallery }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);

  async function unlockWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/g/${gallery.slug}/access/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(apiError(data, "That password is not correct."));
      return;
    }
    setUnlocking(true);
    router.refresh();
  }

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/g/${gallery.slug}/access/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(apiError(data, "Could not request a code. Please try again."));
        return;
      }
      setDemoCode(typeof data?.demoCode === "string" ? data.demoCode : null);
      setStep("code");
    } catch {
      setError("Could not request a code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/g/${gallery.slug}/access/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(apiError(data, "That code is not correct."));
      return;
    }
    setUnlocking(true);
    router.refresh();
  }

  return (
    <div className="grid min-h-dvh bg-teal-950 text-cream lg:grid-cols-[1.15fr_0.85fr]">
      <div className="relative hidden overflow-hidden lg:block">
        {gallery.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={gallery.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(48,213,180,0.22),transparent_55%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-teal-950 via-teal-950/40 to-teal-950/20" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Logo light compact href={null} />
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-gold">Private gallery</p>
            <p className="mt-3 max-w-md font-serif text-[40px] leading-[1.03]">{gallery.title}</p>
            {gallery.subtitle && <p className="mt-3 max-w-md text-[14px] leading-relaxed text-cream/55">{gallery.subtitle}</p>}
          </div>
        </div>
      </div>

      <div className="flex min-h-dvh flex-col bg-cream-soft px-6 py-8 text-ink sm:px-10 lg:justify-center lg:px-14">
        <div className="flex items-center justify-between lg:hidden">
          <Logo href="/" compact />
          <span className="rounded-full border border-gold/40 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-gold-deep">
            Private
          </span>
        </div>

        <div className="mx-auto mt-14 w-full max-w-sm lg:mt-0">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-teal-900/15 bg-white text-teal-900">
            {gallery.access_mode === "password" ? <Lock className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
          </span>
          <p className="mt-5 text-[9px] font-semibold uppercase tracking-[0.28em] text-gold-deep">
            {gallery.access_mode === "password" ? "Password protected" : "Invite only"}
          </p>
          <h1 className="mt-2 font-serif text-[30px] leading-[1.05] text-teal-950 lg:text-[34px]">
            {gallery.access_mode === "password" ? "Enter the gallery password." : "This gallery is held for named guests."}
          </h1>
          <p className="mt-3 text-[13px] leading-relaxed text-ink/55">
            {gallery.access_mode === "password"
              ? "The studio shares the password with you directly. Once unlocked, this device remembers it for fourteen days."
              : step === "email"
                ? "Use the email address the studio approved. We'll send a six-digit code to confirm it's you."
                : `If ${email} is approved, a six-digit code will be sent. It expires in ten minutes.`}
          </p>

          {gallery.access_mode === "password" ? (
            <form onSubmit={unlockWithPassword} className="mt-7 space-y-3">
              <label htmlFor="gallery-password" className="field-label">Gallery password</label>
              <input
                id="gallery-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                autoFocus
              />
              {error && <p className="text-[12px] text-red-800">{error}</p>}
              <button type="submit" disabled={busy || unlocking} className="btn-primary w-full justify-center disabled:opacity-60">
                {busy || unlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {unlocking ? "Unlocking…" : "Unlock gallery"}
              </button>
            </form>
          ) : step === "email" ? (
            <form onSubmit={requestCode} className="mt-7 space-y-3">
              <label htmlFor="guest-email" className="field-label">Your approved email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-900/30" />
                <input
                  id="guest-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field pl-9"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  autoFocus
                />
              </div>
              {error && <p className="text-[12px] text-red-800">{error}</p>}
              <button type="submit" disabled={busy} className="btn-primary w-full justify-center disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Send one-time code
              </button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="mt-7 space-y-3">
              <label htmlFor="guest-code" className="field-label">Six-digit code</label>
              <input
                id="guest-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="field text-center font-mono text-[22px] tracking-[0.4em]"
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                autoFocus
              />
              {demoCode && (
                <p className="rounded-sm border border-gold/40 bg-gold/10 px-3 py-2 text-[11px] text-gold-deep">
                  Development delivery: <span className="font-mono tracking-[0.18em]">{demoCode}</span>
                </p>
              )}
              {error && <p className="text-[12px] text-red-800">{error}</p>}
              <button type="submit" disabled={busy || unlocking || code.length !== 6} className="btn-primary w-full justify-center disabled:opacity-60">
                {busy || unlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {unlocking ? "Unlocking…" : "Open gallery"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setDemoCode(null);
                  setError(null);
                }}
                className="w-full text-center text-[10.5px] uppercase tracking-[0.14em] text-teal-900/45 hover:text-teal-900"
              >
                Use a different email
              </button>
            </form>
          )}

          <div className="mt-9 border-t border-teal-900/10 pt-4">
            <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-teal-900/35">
              <ShieldCheck className="h-3.5 w-3.5 text-gold-deep" /> Shared privately by {gallery.studio_name}
            </p>
            <p className="mt-2 text-[10.5px] leading-relaxed text-ink/35">No account needed. The studio decides who can view and download.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
