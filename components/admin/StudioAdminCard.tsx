"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  CheckCircle2,
  Clock,
  HardDrive,
  KeyRound,
  Loader2,
  Mail,
  PauseCircle,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { CopyButton } from "@/components/ui/CopyButton";
import { cn, formatBytes, formatDate, timeAgo } from "@/lib/format";
import { apiError } from "@/components/studio/manager/ManagerTypes";

export interface AdminStudio {
  id: string;
  name: string;
  email: string;
  status: string;
  storage_limit_bytes: number;
  invite_token: string | null;
  invite_expires_at: string | null;
  created_at: string;
  last_seen_at: string | null;
  gallery_count: number;
  published_count: number;
  item_count: number;
  storage_used: number;
}

export function StudioAdminCard({ studio, origin }: { studio: AdminStudio; origin: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"limit" | "status" | "invite" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitOpen, setLimitOpen] = useState(false);
  const [limitGb, setLimitGb] = useState(String(Math.round((studio.storage_limit_bytes / 1024 ** 3) * 10) / 10));
  const [suspendOpen, setSuspendOpen] = useState(false);
  const inviteUrl = studio.status === "invited" && studio.invite_token ? `${origin}/invite/${studio.invite_token}` : null;

  const pending = studio.status === "invited";
  const suspended = studio.status === "suspended";
  const pct = Math.min(100, Math.round((studio.storage_used / Math.max(studio.storage_limit_bytes, 1)) * 100));

  async function update(payload: Record<string, unknown>, tag: "limit" | "status") {
    setBusy(tag);
    setError(null);
    try {
      const res = await fetch(`/api/admin/studios/${studio.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(apiError(data, "Could not update this studio."));
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Network error. Try again.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function saveLimit() {
    const gb = Number(limitGb);
    if (!Number.isFinite(gb) || gb < 1 || gb > 2000) {
      setError("Enter a storage limit between 1 and 2000 GB.");
      return;
    }
    if (await update({ storageGb: gb }, "limit")) setLimitOpen(false);
  }

  async function setStatus(status: "active" | "suspended") {
    if (await update({ status }, "status")) setSuspendOpen(false);
  }

  async function resend() {
    setBusy("invite");
    setError(null);
    try {
      const res = await fetch(`/api/admin/studios/${studio.id}/invite`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(apiError(data, "Could not create a new invitation."));
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className={cn("rounded-sm border bg-white p-5", suspended ? "border-red-900/20" : "border-teal-900/10")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-teal-900/10 bg-cream font-serif text-[13px] text-teal-900">
            {studio.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-serif text-[19px] leading-tight text-teal-950">{studio.name}</p>
            <p className="truncate text-[10.5px] text-ink/40">{studio.email}</p>
          </div>
        </div>
        <StatusPill status={studio.status} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-y border-teal-900/10 py-3 text-center">
        <div>
          <p className="font-serif text-lg text-teal-950">{studio.gallery_count}</p>
          <p className="text-[8.5px] uppercase tracking-[0.12em] text-teal-900/35">Galleries</p>
        </div>
        <div>
          <p className="font-serif text-lg text-teal-950">{studio.published_count}</p>
          <p className="text-[8.5px] uppercase tracking-[0.12em] text-teal-900/35">Published</p>
        </div>
        <div>
          <p className="font-serif text-lg text-teal-950">{studio.item_count}</p>
          <p className="text-[8.5px] uppercase tracking-[0.12em] text-teal-900/35">Items</p>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[9.5px] text-teal-900/40">
          <span>{formatBytes(studio.storage_used)} used</span>
          <span>of {formatBytes(studio.storage_limit_bytes)}</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-teal-900/10">
          <div className={cn("h-full rounded-full", pct > 90 ? "bg-red-700" : "bg-turquoise-deep")} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9.5px] text-ink/35">
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Joined {formatDate(studio.created_at)}</span>
        {pending ? (
          <span className="flex items-center gap-1"><KeyRound className="h-3 w-3" /> Awaiting acceptance</span>
        ) : (
          <span className="flex items-center gap-1"><UserRound className="h-3 w-3" /> {studio.last_seen_at ? `Seen ${timeAgo(studio.last_seen_at)}` : "Not signed in yet"}</span>
        )}
      </p>

      {error && <p className="mt-3 rounded-sm border border-red-900/15 bg-red-50 px-3 py-2 text-[11px] text-red-800">{error}</p>}

      {pending ? (
        <div className="mt-4 space-y-2">
          {inviteUrl ? (
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate rounded-sm border border-teal-900/10 bg-cream px-2.5 py-2 font-mono text-[9.5px] text-teal-900/70">{inviteUrl}</p>
              <CopyButton value={inviteUrl} iconOnly />
            </div>
          ) : (
            <p className="text-[10.5px] text-ink/40">No invitation link stored. Create a fresh one.</p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={resend} disabled={busy === "invite"} className="btn-outline flex-1 justify-center px-3 py-2 text-[10px]">
              {busy === "invite" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              New invitation link
            </button>
          </div>
          {studio.invite_expires_at && <p className="text-[9.5px] text-ink/30">Invite expires {formatDate(studio.invite_expires_at)}.</p>}
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => { setError(null); setLimitGb(String(Math.round((studio.storage_limit_bytes / 1024 ** 3) * 10) / 10)); setLimitOpen(true); }} className="btn-outline flex-1 justify-center px-3 py-2 text-[10px]">
            <HardDrive className="h-3 w-3" /> Storage limit
          </button>
          {suspended ? (
            <button type="button" onClick={() => setStatus("active")} disabled={busy === "status"} className="btn-turquoise flex-1 justify-center px-3 py-2 text-[10px]">
              {busy === "status" ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} Reactivate
            </button>
          ) : (
            <button type="button" onClick={() => { setError(null); setSuspendOpen(true); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-sm border border-red-900/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-red-800 transition hover:bg-red-50">
              <Ban className="h-3 w-3" /> Suspend
            </button>
          )}
        </div>
      )}

      <Modal open={limitOpen} onClose={() => setLimitOpen(false)} eyebrow="Storage" title={`Limit for ${studio.name}`}>
        <div>
          <label htmlFor={`limit-${studio.id}`} className="field-label">Storage limit (GB)</label>
          <input
            id={`limit-${studio.id}`}
            type="number"
            min={1}
            max={2000}
            value={limitGb}
            onChange={(e) => setLimitGb(e.target.value)}
            className="field mt-2"
          />
          <p className="mt-2 text-[10.5px] text-ink/40">
            Currently using {formatBytes(studio.storage_used)} including uploads in progress; {studio.item_count} ready items.
          </p>
          {error && <p role="alert" className="mt-2 text-[12px] text-red-800">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setLimitOpen(false)} className="btn-ghost">Cancel</button>
          <button type="button" onClick={saveLimit} disabled={busy === "limit"} className="btn-primary disabled:opacity-60">
            {busy === "limit" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save limit
          </button>
        </div>
      </Modal>

      <Modal open={suspendOpen} onClose={() => setSuspendOpen(false)} eyebrow="Suspension" title={`Suspend ${studio.name}?`}>
        <p className="text-[13px] leading-relaxed text-ink/60">
          The studio is signed out immediately and cannot sign in until reactivated. Published gallery links continue
          to work unless expired or revoked. Use Revoke on a gallery to close it to guests.
        </p>
        {error && <p role="alert" className="mt-3 text-[12px] text-red-800">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setSuspendOpen(false)} className="btn-ghost">Keep active</button>
          <button
            type="button"
            onClick={() => setStatus("suspended")}
            disabled={busy === "status"}
            className="inline-flex items-center gap-2 rounded-sm bg-red-800 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-red-900 disabled:opacity-60"
          >
            {busy === "status" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Suspend studio
          </button>
        </div>
      </Modal>
    </article>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "invited") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[8.5px] font-semibold uppercase tracking-[0.12em] text-gold-deep">
        <Mail className="h-3 w-3" /> Pending
      </span>
    );
  }
  if (status === "suspended") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-red-900/20 bg-red-50 px-2.5 py-1 text-[8.5px] font-semibold uppercase tracking-[0.12em] text-red-800">
        <PauseCircle className="h-3 w-3" /> Suspended
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-turquoise-deep/25 bg-turquoise/15 px-2.5 py-1 text-[8.5px] font-semibold uppercase tracking-[0.12em] text-teal-900">
      <ShieldCheck className="h-3 w-3" /> Active
    </span>
  );
}
