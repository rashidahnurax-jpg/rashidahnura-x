"use client";

import { useState } from "react";
import { Film, Loader2, Play, Youtube } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import type { ManagerChapter } from "./ManagerTypes";
import { apiError } from "./ManagerTypes";

export function YoutubeDialog({
  open,
  onClose,
  galleryId,
  chapters,
  defaultChapterId,
  onAdded,
  setNotice,
}: {
  open: boolean;
  onClose: () => void;
  galleryId: string;
  chapters: ManagerChapter[];
  defaultChapterId: string;
  onAdded: () => Promise<void>;
  setNotice: (text: string, tone?: "success" | "error") => void;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [chapterId, setChapterId] = useState(defaultChapterId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/studio/galleries/${galleryId}/youtube`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, title, chapterId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(apiError(data, "Could not add this YouTube film."));
        setBusy(false);
        return;
      }
      await onAdded();
      setBusy(false);
      setUrl("");
      setTitle("");
      onClose();
      if (data?.warning) {
        setNotice(String(data.warning), "error");
      } else {
        setNotice("Film added. It plays in the official YouTube player.");
      }
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={() => !busy && onClose()} eyebrow="Official YouTube player" title="Add a film">
      <form onSubmit={add} className="space-y-4">
        <div>
          <label htmlFor="yt-url" className="field-label">YouTube link</label>
          <input
            id="yt-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="field mt-2"
            placeholder="https://www.youtube.com/watch?v=…"
            required
            autoFocus
          />
          <p className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-ink/40">
            <Youtube className="h-3.5 w-3.5 text-red-700" /> Public or unlisted films only. The link is verified before saving.
          </p>
        </div>
        <div>
          <label htmlFor="yt-title" className="field-label">Title <span className="normal-case tracking-normal text-ink/35">(optional)</span></label>
          <input
            id="yt-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="field mt-2"
            maxLength={160}
            placeholder="Uses the YouTube title when left blank"
          />
        </div>
        <div>
          <label htmlFor="yt-chapter" className="field-label">Chapter</label>
          <select id="yt-chapter" value={chapterId} onChange={(e) => setChapterId(e.target.value)} className="field mt-2">
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>{chapter.title}</option>
            ))}
          </select>
        </div>

        <div className="rounded-sm border border-teal-900/10 bg-cream p-3 text-[11px] leading-relaxed text-ink/55">
          <p className="flex items-center gap-2 font-semibold text-teal-950">
            <Film className="h-3.5 w-3.5 text-gold-deep" /> Have the original film?
          </p>
          <p className="mt-1">
            After adding, open the film in Media and attach your original video file. Guests will see
            &ldquo;Download original&rdquo; whenever film downloads are allowed.
          </p>
        </div>

        {error && <p className="text-[12px] text-red-800">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={busy || !url.trim()} className="btn-primary disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {busy ? "Verifying…" : "Add film"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
