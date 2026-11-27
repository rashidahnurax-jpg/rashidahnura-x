"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, Mail, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { apiError } from "@/components/studio/manager/ManagerTypes";

export function EmailGate({
  open,
  slug,
  onClose,
  onUnlocked,
}: {
  open: boolean;
  slug: string;
  onClose: () => void;
  onUnlocked: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setError(null);
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/g/${slug}/access/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(apiError(data, "Could not save that email."));
      return;
    }
    onUnlocked(typeof data?.email === "string" ? data.email : email);
  }

  return (
    <Modal open={open} onClose={onClose} eyebrow="Before you download" title="Tell the studio who is viewing.">
      <p className="text-[13px] leading-relaxed text-ink/60">
        Downloads are free. The studio asks for your email so it knows who is taking the work home. You can keep
        browsing without it — only downloads are held.
      </p>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <label htmlFor="download-email" className="field-label">Your email</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-900/30" />
          <input
            id="download-email"
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
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {busy ? "Opening downloads…" : "Unlock downloads"}
        </button>
        <p className="flex items-center justify-center gap-1.5 text-[10px] text-teal-900/35">
          <ShieldCheck className="h-3 w-3 text-gold-deep" /> No account, no marketing. Just an honest guestbook.
        </p>
      </form>
    </Modal>
  );
}
