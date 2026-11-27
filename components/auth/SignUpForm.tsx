"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "Unable to create your studio account.");
        setBusy(false);
        return;
      }
      router.replace("/studio");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <div>
        <label htmlFor="signup-name" className="field-label">Your name or studio name</label>
        <input
          id="signup-name"
          type="text"
          autoComplete="name"
          maxLength={90}
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Studio name"
          className="field mt-2"
        />
      </div>
      <div>
        <label htmlFor="signup-email" className="field-label">Email</label>
        <input
          id="signup-email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@studio.com"
          className="field mt-2"
        />
      </div>
      <div>
        <label htmlFor="signup-password" className="field-label">Password</label>
        <div className="relative mt-2">
          <input
            id="signup-password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 12 characters"
            className="field pr-12"
          />
          <button
            type="button"
            onClick={() => setShow((visible) => !visible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-teal-900/40 hover:text-teal-900"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-sm border border-red-900/15 bg-red-50 px-3 py-2.5 text-[12px] text-red-800">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {busy ? "Creating workspace…" : "Create studio account"}
        {!busy && <ArrowRight className="h-4 w-4" />}
      </button>

      <p className="text-center text-[11px] leading-relaxed text-ink/45">
        Studio accounts only · 5 GB storage · Admin access is invitation-only
      </p>
      <p className="pt-1 text-center text-[11px] text-ink/50">
        Already have an account?{" "}
        <Link href="/signin" className="font-semibold text-teal-900 underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </form>
  );
}
