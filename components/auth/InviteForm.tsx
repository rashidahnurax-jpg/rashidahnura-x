"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";

export function InviteForm({ token, initialName, email }: { token: string; initialName: string; email: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Choose at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not activate this invitation.");
        setBusy(false);
        return;
      }
      router.replace("/studio");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <div>
        <label htmlFor="invite-name" className="field-label">Studio name</label>
        <input
          id="invite-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={90}
          className="field mt-2"
          placeholder="Your studio"
        />
      </div>
      <div>
        <label className="field-label">Email</label>
        <p className="mt-2 rounded-sm border border-teal-900/10 bg-cream px-4 py-3 text-[13px] text-ink/55">{email}</p>
      </div>
      <div>
        <label htmlFor="invite-password" className="field-label">Choose a password</label>
        <div className="relative mt-2">
          <input
            id="invite-password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            className="field pr-12"
            placeholder="At least 8 characters"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-teal-900/40 hover:text-teal-900"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="invite-confirm" className="field-label">Confirm password</label>
        <input
          id="invite-confirm"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className="field mt-2"
          placeholder="Repeat the password"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-sm border border-red-900/15 bg-red-50 px-3 py-2.5 text-[12px] text-red-800">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {busy ? "Activating…" : "Activate studio"}
        {!busy && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
}
