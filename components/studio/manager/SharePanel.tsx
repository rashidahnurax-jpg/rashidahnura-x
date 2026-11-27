"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Eye,
  Globe2,
  Loader2,
  Lock,
  Send,
  Sparkles,
  Trash2,
  Undo2,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { CopyButton, WhatsAppShare } from "@/components/ui/CopyButton";
import { StatusBadge } from "@/components/ui/Badges";
import { formatDate, isExpired } from "@/lib/format";
import type { ManagerGallery } from "./ManagerTypes";
import { apiError, expireLabel } from "./ManagerTypes";

export function SharePanel({
  gallery,
  origin,
  itemsCount,
  readyCount,
  emailsCount,
  reload,
  setNotice,
  onPreview,
}: {
  gallery: ManagerGallery;
  origin: string;
  itemsCount: number;
  readyCount: number;
  emailsCount: number;
  reload: () => Promise<void>;
  setNotice: (text: string, tone?: "success" | "error") => void;
  onPreview: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"publish" | "unpublish" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const url = `${origin}/g/${gallery.slug}`;
  const expired = isExpired(gallery.expires_at);
  const live = gallery.status === "published" && !gallery.revoked_at && !expired;

  async function publish() {
    setBusy("publish");
    setError(null);
    const res = await fetch(`/api/studio/galleries/${gallery.id}/publish`, { method: "POST" });
    const data = await res.json().catch(() => null);
    setBusy(null);
    if (!res.ok) {
      setError(apiError(data, "Could not publish this gallery."));
      return;
    }
    await reload();
    setNotice("Gallery published. The link is live.");
  }

  async function unpublish() {
    setBusy("unpublish");
    const res = await fetch(`/api/studio/galleries/${gallery.id}/unpublish`, { method: "POST" });
    const data = await res.json().catch(() => null);
    setBusy(null);
    if (!res.ok) {
      setError(apiError(data, "Could not unpublish this gallery."));
      return;
    }
    setConfirmUnpublish(false);
    await reload();
    setNotice("Gallery unpublished. Earlier unlocks were invalidated.");
  }

  async function remove() {
    setBusy("delete");
    const res = await fetch(`/api/studio/galleries/${gallery.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    setBusy(null);
    if (!res.ok) {
      setError(apiError(data, "Could not delete this gallery."));
      return;
    }
    router.replace("/studio");
    router.refresh();
  }

  const checklist = [
    { label: "At least one ready photograph or film", ok: readyCount > 0 },
    { label: "Password set", ok: gallery.access_mode !== "password" || gallery.has_password, optional: gallery.access_mode !== "password" },
    { label: "Approved emails added", ok: gallery.access_mode !== "invite" || emailsCount > 0, optional: gallery.access_mode !== "invite" },
    { label: "Expiry date is in the future", ok: !expired },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-sm border border-teal-900/15 bg-teal-950 text-cream">
          <div className="border-b border-cream/10 px-5 py-4 md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="label text-gold">The one link</p>
              <StatusBadge gallery={gallery} className="border-cream/20 bg-cream/10 text-cream/80" />
            </div>
            <p className="mt-3 break-all font-serif text-[19px] leading-snug md:text-[22px]">{url}</p>
            <p className="mt-2 text-[10.5px] leading-relaxed text-cream/45">
              {live
                ? "Live. Updates appear at this same link — share it once."
                : gallery.revoked_at
                  ? "This link was revoked by NURA-X. Ask the admin to restore it before sharing."
                  : "The link is reserved. Publish before sharing."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 px-5 py-4 md:px-6">
            <CopyButton value={url} className="border-cream/25 text-cream hover:border-cream/60 hover:bg-cream/5" />
            <WhatsAppShare
              url={url}
              title={gallery.title}
              className="border-cream/25 text-cream hover:border-cream/60 hover:bg-cream/5"
            />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost px-3 py-2.5 text-[10px] uppercase tracking-[0.14em] text-cream/55 hover:text-cream"
            >
              Open <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </section>

        {live ? (
          <section className="rounded-sm border border-teal-900/10 bg-white p-5 md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-900/50">
                  <Globe2 className="h-3.5 w-3.5 text-turquoise-deep" /> Published
                </p>
                <p className="mt-2 text-[12px] leading-relaxed text-ink/55">
                  Guests can open the link now.{" "}
                  {gallery.access_mode === "open"
                    ? "Access is open."
                    : gallery.access_mode === "email"
                      ? "An email is requested before downloads."
                      : gallery.access_mode === "invite"
                        ? "Only approved emails can unlock it."
                        : "A gallery password is required."}
                </p>
                <p className="mt-1 text-[10.5px] text-ink/35">
                  Published {formatDate(gallery.published_at)} · {gallery.view_count} view{gallery.view_count === 1 ? "" : "s"}
                </p>
              </div>
              <button type="button" onClick={onPreview} className="btn-outline shrink-0 px-3 py-2 text-[10px]">
                <Eye className="h-3.5 w-3.5" /> Preview
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-teal-900/10 pt-4">
              <button
                type="button"
                onClick={() => setConfirmUnpublish(true)}
                className="btn-ghost px-3 py-2 text-[10px]"
              >
                <Undo2 className="h-3.5 w-3.5" /> Unpublish
              </button>
              <span className="text-[10px] leading-relaxed text-ink/35">
                Unpublishing keeps every file and chapter. It only closes the door and re-locks previously unlocked visitors.
              </span>
            </div>
          </section>
        ) : (
          <section className="rounded-sm border border-teal-900/10 bg-white p-5 md:p-6">
            <p className="label text-gold-deep">Before you publish</p>
            <h3 className="mt-2 font-serif text-2xl text-teal-950">Open the gallery</h3>
            <ul className="mt-4 space-y-2">
              {checklist.map((row) => (
                <li key={row.label} className="flex items-center gap-2 text-[12px]">
                  <span
                    className={
                      row.ok
                        ? "flex h-4 w-4 items-center justify-center rounded-full bg-turquoise text-teal-950"
                        : row.optional
                          ? "flex h-4 w-4 items-center justify-center rounded-full border border-teal-900/15 text-teal-900/30"
                          : "flex h-4 w-4 items-center justify-center rounded-full border border-amber-600/40 bg-amber-50 text-amber-700"
                    }
                  >
                    <Check className="h-2.5 w-2.5" />
                  </span>
                  <span className={row.ok ? "text-ink/65" : row.optional ? "text-ink/35" : "text-ink/65"}>{row.label}</span>
                </li>
              ))}
            </ul>

            {gallery.revoked_at && (
              <p className="mt-4 flex items-start gap-2 rounded-sm border border-red-900/15 bg-red-50 p-3 text-[11.5px] leading-relaxed text-red-800">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" /> NURA-X revoked this link. Contact the admin before publishing again.
              </p>
            )}
            {expired && (
              <p className="mt-4 flex items-start gap-2 rounded-sm border border-amber-700/20 bg-amber-50 p-3 text-[11.5px] leading-relaxed text-amber-900">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> The expiry date is in the past. Choose a new date under Access.
              </p>
            )}
            {error && <p className="mt-3 text-[11.5px] text-red-800">{error}</p>}

            <button
              type="button"
              onClick={publish}
              disabled={busy === "publish" || Boolean(gallery.revoked_at) || readyCount === 0}
              className="btn-primary mt-5 w-full disabled:opacity-50"
            >
              {busy === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {busy === "publish" ? "Publishing…" : gallery.status === "unpublished" ? "Publish again" : "Publish gallery"}
            </button>
            <p className="mt-2 text-center text-[10px] text-ink/35">
              {itemsCount - readyCount > 0
                ? `${itemsCount - readyCount} item${itemsCount - readyCount === 1 ? " is" : "s are"} still uploading and will stay hidden until ready.`
                : "You can keep editing after publishing; the link never changes."}
            </p>
          </section>
        )}
      </div>

      <div className="space-y-6">
        <section className="rounded-sm border border-gold/35 bg-cream p-5 md:p-6">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-deep">
            <Sparkles className="h-3.5 w-3.5" /> {gallery.featured ? "Featured" : "Unlisted"}
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-ink/60">
            {gallery.featured
              ? "This gallery appears on the public homepage and archive. NURA-X can unfeature it."
              : "This gallery is unlisted. It opens only for people you share the link with — or approved emails, if invited."}
          </p>
        </section>

        <section className="rounded-sm border border-teal-900/10 bg-white p-5 md:p-6">
          <p className="label text-gold-deep">Reference</p>
          <dl className="mt-3 divide-y divide-teal-900/10 text-[11.5px]">
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-ink/40">Access</dt>
              <dd className="font-medium capitalize text-teal-950">{gallery.access_mode === "email" ? "Email gate" : gallery.access_mode}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-ink/40">Photo downloads</dt>
              <dd className="text-teal-950">{gallery.allow_photo_downloads ? "Allowed" : "Off"}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-ink/40">Film downloads</dt>
              <dd className="text-teal-950">{gallery.allow_video_downloads ? "Allowed" : "Off"}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-ink/40">Expiry</dt>
              <dd className="text-teal-950">{expireLabel(gallery.expires_at)}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-ink/40">Media</dt>
              <dd className="text-teal-950">{readyCount} ready</dd>
            </div>
          </dl>
        </section>

        {gallery.kind !== "flagship" && (
          <section className="rounded-sm border border-red-900/10 bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-red-800/70">Danger zone</p>
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink/50">
              Deleting removes the gallery, its chapters and every stored original. This cannot be undone.
            </p>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="mt-3 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-800 hover:text-red-900"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete gallery
            </button>
          </section>
        )}
      </div>

      <Modal open={confirmUnpublish} onClose={() => setConfirmUnpublish(false)} eyebrow="Close the door" title="Unpublish this gallery?">
        <p className="text-[13px] leading-relaxed text-ink/60">
          The link will stop serving previews and downloads, and anyone already unlocked will need to unlock again if
          you republish. Media and chapters are kept.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setConfirmUnpublish(false)} className="btn-ghost">Keep published</button>
          <button
            type="button"
            onClick={unpublish}
            disabled={busy === "unpublish"}
            className="btn-primary disabled:opacity-60"
          >
            {busy === "unpublish" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Unpublish
          </button>
        </div>
      </Modal>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} eyebrow="Permanent" title={`Delete “${gallery.title}”?`}>
        <p className="text-[13px] leading-relaxed text-ink/60">
          This removes the gallery, all chapters and every stored file. Guests will lose access immediately. This
          action cannot be undone.
        </p>
        {error && <p className="mt-3 text-[11.5px] text-red-800">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setConfirmDelete(false)} className="btn-ghost">Cancel</button>
          <button
            type="button"
            onClick={remove}
            disabled={busy === "delete"}
            className="inline-flex items-center gap-2 rounded-sm bg-red-800 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-red-900 disabled:opacity-60"
          >
            {busy === "delete" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Delete permanently
          </button>
        </div>
      </Modal>
    </div>
  );
}
