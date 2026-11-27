"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Copy, Link2, Loader2, MailPlus, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { CopyButton } from "@/components/ui/CopyButton";
import { apiError } from "@/components/studio/manager/ManagerTypes";

export function InviteStudioButton({ origin, full = false }: { origin: string; full?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [storageGb, setStorageGb] = useState("50");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ url: string; email: string; expiresAt: string } | null>(null);

  function reset() {
    setName("");
    setEmail("");
    setStorageGb("50");
    setBusy(false);
    setError(null);
    setInvite(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/studios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, storageGb: Number(storageGb) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(apiError(data, "Could not create the invitation."));
        setBusy(false);
        return;
      }
      setInvite({
        url: `${origin}${data.invitePath}`,
        email: data.email,
        expiresAt: data.expiresAt,
      });
      setBusy(false);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className={full ? "btn-primary w-full" : "btn-primary"}
      >
        <UserPlus className="h-4 w-4" /> Invite studio
      </button>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        eyebrow={invite ? "Invitation created" : "New studio"}
        title={invite ? "Send this private invitation" : "Bring a studio on board"}
      >
        {invite ? (
          <div className="space-y-5">
            <div className="rounded-sm border border-teal-900/10 bg-cream p-4">
              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-900/45">
                <Link2 className="h-3.5 w-3.5 text-gold-deep" /> Invitation for {invite.email}
              </p>
              <p className="mt-2 break-all rounded-sm border border-teal-900/10 bg-white px-3 py-2.5 font-mono text-[11px] text-teal-900">
                {invite.url}
              </p>
              <p className="mt-2 text-[10.5px] text-ink/40">
                Expires {new Date(invite.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.
                Email delivery is not connected — send this link directly. The studio sets its own password.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <CopyButton value={invite.url} />
                <a href={invite.url} target="_blank" rel="noopener noreferrer" className="btn-ghost px-3 py-2.5 text-[10px]">
                  Open <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-teal-900/50">
              <Check className="h-3.5 w-3.5 text-turquoise-deep" />
              The studio appears under Pending until the invitation is accepted.
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
                className="btn-primary"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="invite-studio-name" className="field-label">Studio name</label>
              <input
                id="invite-studio-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="field mt-2"
                placeholder="e.g. Keffi Lights Studio"
                maxLength={90}
                required
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="invite-studio-email" className="field-label">Email</label>
              <input
                id="invite-studio-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field mt-2"
                placeholder="studio@example.com"
                required
              />
            </div>
            <div>
              <label htmlFor="invite-studio-storage" className="field-label">Storage limit (GB)</label>
              <input
                id="invite-studio-storage"
                type="number"
                min={1}
                max={1000}
                value={storageGb}
                onChange={(e) => setStorageGb(e.target.value)}
                className="field mt-2"
                required
              />
            </div>

            {error && <p className="text-[12px] text-red-800">{error}</p>}

            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost justify-center" disabled={busy}>
                Cancel
              </button>
              <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailPlus className="h-4 w-4" />}
                {busy ? "Creating…" : "Create invitation"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
