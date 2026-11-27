"use client";

import { useEffect, useState } from "react";
import { Check, Download, Heart, Loader2, Mail, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/format";
import { apiError } from "@/components/studio/manager/ManagerTypes";
import {
  itemCanDownload,
  itemThumbSrc,
  prettySize,
  type GalleryItem,
  type GalleryView,
} from "./types";

export function SelectionPanel({
  open,
  onClose,
  gallery,
  items,
  selected,
  canDownload,
  emailKnown,
  onRemove,
  onDownloadZip,
  onRequestDownloads,
  onSubmitted,
  zipBusy,
}: {
  open: boolean;
  onClose: () => void;
  gallery: GalleryView;
  items: GalleryItem[];
  selected: Set<string>;
  canDownload: boolean;
  emailKnown: string | null;
  onRemove: (id: string) => void;
  onDownloadZip: (ids: string[]) => void;
  onRequestDownloads: (ids: string[]) => void;
  onSubmitted: (count: number) => void;
  zipBusy: boolean;
}) {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentCount, setSentCount] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
      setBusy(false);
      setSentCount(null);
      setNote("");
    } else if (emailKnown) {
      setEmail(emailKnown);
    }
  }, [open, emailKnown]);

  const chosen = items.filter((item) => selected.has(item.id));
  const downloadable = chosen.filter((item) => itemCanDownload(gallery, item, true));
  const downloadBytes = downloadable.reduce(
    (sum, item) => sum + Number(item.kind === "youtube" ? item.attachment_size ?? 0 : item.size_bytes ?? 0),
    0,
  );

  async function submit() {
    if (!chosen.length) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/g/${gallery.slug}/selection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemIds: chosen.map((item) => item.id),
        email: email.trim() || undefined,
        note: note.trim() || undefined,
      }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(apiError(data, "Could not send your selection."));
      return;
    }
    setSentCount(Number(data?.count ?? chosen.length));
    onSubmitted(Number(data?.count ?? chosen.length));
  }

  function download() {
    if (!downloadable.length) return;
    if (!canDownload) {
      onRequestDownloads(downloadable.map((item) => item.id));
      return;
    }
    onDownloadZip(downloadable.map((item) => item.id));
  }

  return (
    <Modal open={open} onClose={onClose} eyebrow="Your selection" title={sentCount ? "Selection sent." : "Keep the frames you love."}>
      {sentCount ? (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-sm border border-turquoise-deep/25 bg-turquoise/[0.08] p-4">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-turquoise text-teal-950">
              <Check className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-teal-950">
                {sentCount} {sentCount === 1 ? "picture" : "pictures"} sent to {gallery.studio_name}.
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink/55">
                The studio sees your choices in its workspace. Downloads stay free — take your selection with you now or
                return to this link any time before it expires.
              </p>
            </div>
          </div>

          {downloadable.length > 0 ? (
            <button
              type="button"
              onClick={download}
              disabled={zipBusy}
              className="btn-turquoise w-full justify-center disabled:opacity-60"
            >
              {zipBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {zipBusy
                ? "Preparing archive…"
                : canDownload
                  ? `Download ZIP · ${downloadable.length} ${downloadable.length === 1 ? "file" : "files"}${downloadBytes ? ` · ${prettySize(downloadBytes)}` : ""}`
                  : "Enter email to download"}
            </button>
          ) : (
            <p className="text-[11px] text-ink/45">
              The studio has downloads switched off for the media you selected. Your selection is still saved.
            </p>
          )}

          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="btn-primary">Done</button>
          </div>
        </div>
      ) : (
        <div>
          {chosen.length === 0 ? (
            <p className="py-8 text-center text-[12px] text-ink/40">Your selection is empty. Tap the heart on any photograph.</p>
          ) : (
            <>
              <div className="max-h-[42vh] space-y-2 overflow-y-auto pr-1">
                {chosen.map((item) => {
                  const thumb = itemThumbSrc(gallery, item);
                  const allowed = itemCanDownload(gallery, item, true);
                  return (
                    <div key={item.id} className="flex items-center gap-3 rounded-sm border border-teal-900/10 bg-white p-2">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-teal-900/5">
                        {thumb && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-teal-950">{item.title}</p>
                        <p className="text-[9.5px] uppercase tracking-[0.1em] text-ink/35">
                          {item.kind === "photo" ? "Photograph" : "Film"} · {allowed ? prettySize(item.kind === "youtube" ? item.attachment_size : item.size_bytes) : "downloads off"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-ink/30 transition hover:bg-red-50 hover:text-red-800"
                        aria-label={`Remove ${item.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 space-y-3">
                {!emailKnown && (
                  <div>
                    <label htmlFor="selection-email" className="field-label">Your email (optional)</label>
                    <div className="relative mt-1.5">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-900/30" />
                      <input
                        id="selection-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="field pl-9 text-[12px]"
                        placeholder="So the studio can reply"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label htmlFor="selection-note" className="field-label">Note for the studio (optional)</label>
                  <textarea
                    id="selection-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    maxLength={800}
                    className="field mt-1.5 resize-none text-[12px]"
                    placeholder="e.g. We would love prints of these two."
                  />
                </div>
              </div>

              {error && <p className="mt-3 text-[12px] text-red-800">{error}</p>}

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-1.5 text-[10px] text-ink/40">
                  <Heart className="h-3 w-3 text-turquoise-deep" /> {chosen.length} selected
                  {downloadable.length !== chosen.length && canDownload && (
                    <span className="text-ink/30">· {downloadable.length} downloadable</span>
                  )}
                </p>
                <div className="flex gap-2">
                  {downloadable.length > 0 && (
                    <button
                      type="button"
                      onClick={download}
                      disabled={zipBusy}
                      className={cn("btn-outline px-4 py-2.5 text-[10px] disabled:opacity-60")}
                    >
                      {zipBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      ZIP
                    </button>
                  )}
                  <button type="button" onClick={submit} disabled={busy} className="btn-primary disabled:opacity-60">
                    {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Send selection
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
