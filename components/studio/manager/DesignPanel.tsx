"use client";

import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/format";
import type { ManagerChapter, ManagerGallery, ManagerItem } from "./ManagerTypes";
import { apiError, itemThumb } from "./ManagerTypes";

export function DesignPanel({
  gallery,
  chapters,
  items,
  patchGallery,
  reload,
  setNotice,
  onPreview,
}: {
  gallery: ManagerGallery;
  chapters: ManagerChapter[];
  items: ManagerItem[];
  patchGallery: (payload: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
  reload: () => Promise<void>;
  setNotice: (text: string, tone?: "success" | "error") => void;
  onPreview: () => void;
}) {
  const [title, setTitle] = useState(gallery.title);
  const [subtitle, setSubtitle] = useState(gallery.subtitle ?? "");
  const [description, setDescription] = useState(gallery.description ?? "");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [newChapter, setNewChapter] = useState("");
  const [chapterBusy, setChapterBusy] = useState(false);
  const [editingChapter, setEditingChapter] = useState<string | null>(null);
  const [chapterTitle, setChapterTitle] = useState("");
  const [deleting, setDeleting] = useState<ManagerChapter | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);

  useEffect(() => {
    setTitle(gallery.title);
    setSubtitle(gallery.subtitle ?? "");
    setDescription(gallery.description ?? "");
  }, [gallery.title, gallery.subtitle, gallery.description]);

  const readyItems = items.filter((item) => item.status === "ready");
  const dirty =
    title !== gallery.title ||
    subtitle !== (gallery.subtitle ?? "") ||
    description !== (gallery.description ?? "");

  async function saveIdentity(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    const result = await patchGallery({ title, subtitle, description });
    setSaving(false);
    if (!result.ok) {
      setFormError(result.error ?? "Could not save these details.");
      return;
    }
    setNotice("Gallery details saved.");
  }

  async function addChapter(e: React.FormEvent) {
    e.preventDefault();
    if (!newChapter.trim()) return;
    setChapterBusy(true);
    const res = await fetch(`/api/studio/galleries/${gallery.id}/chapters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newChapter.trim() }),
    });
    const data = await res.json().catch(() => null);
    setChapterBusy(false);
    if (!res.ok) {
      setNotice(apiError(data, "Could not add that chapter."), "error");
      return;
    }
    setNewChapter("");
    await reload();
    setNotice("Chapter added.");
  }

  async function renameChapter(chapter: ManagerChapter) {
    if (!chapterTitle.trim()) return;
    setChapterBusy(true);
    const res = await fetch(`/api/studio/chapters/${chapter.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: chapterTitle.trim() }),
    });
    const data = await res.json().catch(() => null);
    setChapterBusy(false);
    if (!res.ok) {
      setNotice(apiError(data, "Could not rename that chapter."), "error");
      return;
    }
    setEditingChapter(null);
    await reload();
  }

  async function deleteChapter() {
    if (!deleting) return;
    setChapterBusy(true);
    const res = await fetch(`/api/studio/chapters/${deleting.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    setChapterBusy(false);
    if (!res.ok) {
      setNotice(apiError(data, "Could not delete that chapter."), "error");
      return;
    }
    setDeleting(null);
    await reload();
    setNotice("Chapter removed. Its media moved to the next chapter.");
  }

  async function moveChapter(index: number, direction: -1 | 1) {
    const next = [...chapters];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setChapterBusy(true);
    const res = await fetch(`/api/studio/galleries/${gallery.id}/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chapters: next.map((chapter) => ({
          id: chapter.id,
          itemIds: items.filter((item) => item.chapter_id === chapter.id).map((item) => item.id),
        })),
      }),
    });
    setChapterBusy(false);
    if (!res.ok) {
      setNotice("Could not save the chapter order.", "error");
      return;
    }
    await reload();
  }

  async function setCover(itemId: string | null) {
    setCoverBusy(true);
    const result = await patchGallery({ coverItemId: itemId });
    setCoverBusy(false);
    if (!result.ok) {
      setNotice(result.error ?? "Could not set the cover.", "error");
      return;
    }
    setNotice(itemId ? "Cover updated." : "Cover reset to the first photograph.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-sm border border-teal-900/10 bg-white p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label text-gold-deep">Identity</p>
            <h2 className="mt-2 font-serif text-2xl text-teal-950">The words around the work</h2>
          </div>
          <button type="button" onClick={onPreview} className="btn-ghost px-3 py-2 text-[10px]">
            Preview
          </button>
        </div>

        <form onSubmit={saveIdentity} className="mt-5 space-y-4">
          <div>
            <label htmlFor="manager-title" className="field-label">Title</label>
            <input
              id="manager-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="field mt-2"
              maxLength={120}
              required
            />
          </div>
          <div>
            <label htmlFor="manager-subtitle" className="field-label">Subtitle</label>
            <input
              id="manager-subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="field mt-2"
              maxLength={200}
              placeholder="A line beneath the title"
            />
          </div>
          <div>
            <label htmlFor="manager-description" className="field-label">Introduction</label>
            <textarea
              id="manager-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="field mt-2 min-h-[120px] resize-y"
              maxLength={3000}
              placeholder="Tell the guests what they are about to see."
            />
            <p className="mt-1 text-right text-[10px] text-ink/30">{description.length}/3000</p>
          </div>

          {formError && <p className="text-[12px] text-red-800">{formError}</p>}

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className={cn("text-[10px] uppercase tracking-[0.16em]", dirty ? "text-gold-deep" : "text-teal-900/25")}>
              {dirty ? "Unsaved changes" : "Saved"}
            </span>
            <button type="submit" disabled={saving || !dirty || !title.trim()} className="btn-primary px-5 py-2.5 text-[10px] disabled:opacity-40">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save details
            </button>
          </div>
        </form>
      </section>

      <div className="space-y-6">
        <section className="rounded-sm border border-teal-900/10 bg-white p-5 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="label text-gold-deep">Cover</p>
              <h2 className="mt-2 font-serif text-2xl text-teal-950">The first impression</h2>
            </div>
            {coverBusy && <Loader2 className="h-4 w-4 animate-spin text-teal-900/40" />}
          </div>

          {readyItems.length === 0 ? (
            <p className="mt-4 rounded-sm border border-dashed border-teal-900/20 p-5 text-center text-[11.5px] text-ink/40">
              Add photographs or films first.
            </p>
          ) : (
            <>
              <div className="no-scrollbar -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
                <button
                  type="button"
                  onClick={() => setCover(null)}
                  className={cn(
                    "flex h-[86px] w-[86px] shrink-0 flex-col items-center justify-center gap-1 rounded-[3px] border text-[9px] uppercase tracking-[0.1em] transition",
                    !gallery.cover_item_id ? "border-turquoise-deep bg-cream text-teal-900" : "border-teal-900/15 text-teal-900/45 hover:border-teal-900/30",
                  )}
                >
                  <Check className={cn("h-3.5 w-3.5", !gallery.cover_item_id ? "text-turquoise-deep" : "opacity-0")} />
                  Auto
                </button>
                {readyItems.map((item) => {
                  const src = itemThumb(gallery.slug, item);
                  const active = gallery.cover_item_id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCover(item.id)}
                      className={cn(
                        "relative h-[86px] w-[86px] shrink-0 overflow-hidden rounded-[3px] border-2 transition",
                        active ? "border-turquoise-deep" : "border-transparent hover:border-teal-900/20",
                      )}
                      title={item.title ?? undefined}
                    >
                      {src ? (
                        <img src={src} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-teal-900 text-cream/40">
                          <ImageIcon className="h-4 w-4" />
                        </span>
                      )}
                      {active && (
                        <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-turquoise text-teal-950">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] text-ink/35">Shown on the archive card and at the top of the gallery.</p>
            </>
          )}
        </section>

        <section className="rounded-sm border border-teal-900/10 bg-white p-5 md:p-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="label text-gold-deep">Chapters</p>
              <h2 className="mt-2 font-serif text-2xl text-teal-950">A sequence, not a pile</h2>
            </div>
            <span className="text-[10px] uppercase tracking-[0.14em] text-teal-900/35">{chapters.length}</span>
          </div>

          <div className="mt-4 divide-y divide-teal-900/10 rounded-sm border border-teal-900/10">
            {chapters.map((chapter, index) => {
              const count = items.filter((item) => item.chapter_id === chapter.id).length;
              const editing = editingChapter === chapter.id;
              return (
                <div key={chapter.id} className="flex items-center gap-2 bg-cream-soft/60 px-3 py-2.5">
                  <span className="w-5 shrink-0 font-serif text-[11px] text-gold-deep">{String(index + 1).padStart(2, "0")}</span>
                  {editing ? (
                    <form
                      className="flex flex-1 items-center gap-1.5"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void renameChapter(chapter);
                      }}
                    >
                      <input
                        value={chapterTitle}
                        onChange={(e) => setChapterTitle(e.target.value)}
                        className="field h-8 flex-1 px-2 py-1 text-[12px]"
                        autoFocus
                        maxLength={80}
                      />
                      <button type="submit" className="p-1.5 text-teal-900/60 hover:text-teal-950" aria-label="Save chapter name">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => setEditingChapter(null)} className="p-1.5 text-teal-900/35 hover:text-teal-950" aria-label="Cancel">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-medium text-teal-950">{chapter.title}</p>
                        <p className="text-[9.5px] text-ink/35">{count} item{count === 1 ? "" : "s"}</p>
                      </div>
                      <div className="flex shrink-0 items-center">
                        <button
                          type="button"
                          onClick={() => moveChapter(index, -1)}
                          disabled={index === 0 || chapterBusy}
                          className="p-1.5 text-teal-900/35 disabled:opacity-20 hover:text-teal-950"
                          aria-label="Move chapter up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveChapter(index, 1)}
                          disabled={index === chapters.length - 1 || chapterBusy}
                          className="p-1.5 text-teal-900/35 disabled:opacity-20 hover:text-teal-950"
                          aria-label="Move chapter down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingChapter(chapter.id);
                            setChapterTitle(chapter.title);
                          }}
                          className="p-1.5 text-teal-900/35 hover:text-teal-950"
                          aria-label="Rename chapter"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(chapter)}
                          disabled={chapters.length === 1}
                          className="p-1.5 text-teal-900/25 hover:text-red-800 disabled:opacity-20"
                          aria-label="Delete chapter"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <form onSubmit={addChapter} className="mt-3 flex gap-2">
            <input
              value={newChapter}
              onChange={(e) => setNewChapter(e.target.value)}
              className="field h-9 flex-1 px-3 py-1.5 text-[12px]"
              placeholder="New chapter title"
              maxLength={80}
            />
            <button type="submit" disabled={chapterBusy || !newChapter.trim()} className="btn-outline h-9 px-3 text-[10px] disabled:opacity-40">
              <Plus className="h-3 w-3" /> Add
            </button>
          </form>
          <p className="mt-2 text-[10px] text-ink/35">Deleting a chapter moves its media to the next chapter.</p>
        </section>
      </div>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        eyebrow="Remove chapter"
        title={deleting ? `Delete “${deleting.title}”?` : ""}
      >
        <p className="text-[13px] leading-relaxed text-ink/60">
          Media inside this chapter is kept and moved to the next chapter. This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setDeleting(null)} className="btn-ghost">Cancel</button>
          <button
            type="button"
            onClick={deleteChapter}
            disabled={chapterBusy}
            className="inline-flex items-center gap-2 rounded-sm bg-red-800 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-red-900 disabled:opacity-60"
          >
            {chapterBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Delete chapter
          </button>
        </div>
      </Modal>
    </div>
  );
}
