"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Download,
  Film,
  Image as ImageIcon,
  Link2,
  Loader2,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Star,
  Trash2,
  Upload,
  X,
  Youtube,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { formatBytes, cn } from "@/lib/format";
import type { ManagerChapter, ManagerGallery, ManagerItem } from "./ManagerTypes";
import { apiError, itemLarge, itemThumb, mediaApi } from "./ManagerTypes";
import { YoutubeDialog } from "./YoutubeDialog";

const FALLBACK_CHUNK = 4 * 1024 * 1024;

type JobKind = "photo" | "video" | "attachment";
type JobStatus = "queued" | "uploading" | "paused" | "processing" | "done" | "error";

interface UploadJob {
  id: string;
  file: File;
  name: string;
  size: number;
  kind: JobKind;
  chapterId?: string;
  attachmentFor?: string;
  status: JobStatus;
  progress: number;
  offset: number;
  uploadId?: string;
  chunkSize?: number;
  error?: string;
}

function detectKind(file: File): "photo" | "video" | null {
  if (file.type.startsWith("video/") || /\.(mp4|mov|m4v|webm|ogv|mkv|avi)$/i.test(file.name)) return "video";
  if (file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|avif|tiff?|heic|heif)$/i.test(file.name)) return "photo";
  return null;
}

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function putChunk(
  jobId: string,
  uploadId: string,
  file: File,
  start: number,
  end: number,
  onProgress: (loaded: number) => void,
  xhrs: Map<string, XMLHttpRequest>,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhrs.set(jobId, xhr);
    const clear = () => {
      if (xhrs.get(jobId) === xhr) xhrs.delete(jobId);
    };
    xhr.open("PUT", `/api/studio/uploads/${uploadId}?offset=${start}`);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded);
    };
    xhr.onload = () => {
      clear();
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && data && typeof data === "object" && "offset" in data) {
        resolve(Number((data as { offset: number }).offset));
      } else {
        reject(new Error(apiError(data, "A chunk could not be uploaded.")));
      }
    };
    xhr.onerror = () => {
      clear();
      reject(new Error("The connection dropped. Retry to resume."));
    };
    xhr.onabort = () => {
      clear();
      reject(new DOMException("Aborted", "AbortError"));
    };
    xhr.send(file.slice(start, end));
  });
}

export function MediaPanel({
  gallery,
  chapters,
  items,
  patchGallery,
  reload,
  setNotice,
}: {
  gallery: ManagerGallery;
  chapters: ManagerChapter[];
  items: ManagerItem[];
  patchGallery: (payload: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
  reload: () => Promise<void>;
  setNotice: (text: string, tone?: "success" | "error") => void;
}) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const jobsRef = useRef<UploadJob[]>([]);
  const running = useRef(0);
  const claimed = useRef(new Set<string>());
  const paused = useRef(new Set<string>());
  const xhrs = useRef(new Map<string, XMLHttpRequest>());

  const [uploadChapter, setUploadChapter] = useState(chapters[0]?.id ?? "");
  const [menuOpen, setMenuOpen] = useState(false);
  const [youtubeOpen, setYoutubeOpen] = useState(false);
  const [editing, setEditing] = useState<ManagerItem | null>(null);
  const [deleting, setDeleting] = useState<ManagerItem | null>(null);
  const [viewing, setViewing] = useState<ManagerItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editChapter, setEditChapter] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [posterBusy, setPosterBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const mainInput = useRef<HTMLInputElement>(null);
  const attachInput = useRef<HTMLInputElement>(null);
  const posterInput = useRef<HTMLInputElement>(null);

  const updateJobs = useCallback((updater: (list: UploadJob[]) => UploadJob[]) => {
    setJobs((prev) => {
      const next = updater(prev);
      jobsRef.current = next;
      return next;
    });
  }, []);

  const updateJob = useCallback(
    (id: string, patch: Partial<UploadJob>) => {
      updateJobs((list) => list.map((job) => (job.id === id ? { ...job, ...patch } : job)));
    },
    [updateJobs],
  );

  useEffect(() => {
    if (!chapters.some((chapter) => chapter.id === uploadChapter)) {
      setUploadChapter(chapters[0]?.id ?? "");
    }
  }, [chapters, uploadChapter]);

  async function runJob(job: UploadJob) {
    try {
      let uploadId = job.uploadId;
      let chunkSize = job.chunkSize ?? FALLBACK_CHUNK;

      if (!uploadId) {
        const res = await fetch(`/api/studio/galleries/${gallery.id}/uploads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            job.kind === "attachment"
              ? { attachmentFor: job.attachmentFor, fileName: job.name, size: job.size }
              : { fileName: job.name, size: job.size, mime: job.file.type, kind: job.kind, chapterId: job.chapterId },
          ),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(apiError(data, "The upload could not be started."));
        uploadId = String((data as { uploadId: string }).uploadId);
        chunkSize = Number((data as { chunkSize?: number }).chunkSize) || FALLBACK_CHUNK;
        updateJob(job.id, { uploadId, chunkSize, offset: 0, status: "uploading" });
      }

      const session = await fetch(`/api/studio/uploads/${uploadId}`, { cache: "no-store" });
      if (!session.ok) {
        throw new Error("The upload session expired. Remove this file and add it again.");
      }
      const sessionData = (await session.json()) as { offset?: number };
      let offset = Number(sessionData.offset) || 0;
      updateJob(job.id, { status: "uploading", offset, progress: Math.min(0.99, offset / Math.max(job.size, 1)) });

      while (offset < job.size) {
        if (paused.current.has(job.id)) {
          updateJob(job.id, { status: "paused" });
          return;
        }
        const end = Math.min(offset + chunkSize, job.size);
        const nextOffset = await putChunk(
          job.id,
          uploadId,
          job.file,
          offset,
          end,
          (loaded) => {
            updateJob(job.id, { progress: Math.min(0.99, (offset + loaded) / job.size) });
          },
          xhrs.current,
        );
        offset = nextOffset;
        updateJob(job.id, { offset, progress: Math.min(0.99, offset / job.size) });
      }

      if (paused.current.has(job.id)) {
        updateJob(job.id, { status: "paused" });
        return;
      }

      updateJob(job.id, { status: "processing", progress: 1 });
      const complete = await fetch(`/api/studio/uploads/${uploadId}/complete`, { method: "POST" });
      const completeData = await complete.json().catch(() => null);
      if (!complete.ok) throw new Error(apiError(completeData, "The upload could not be finalised."));

      updateJob(job.id, { status: "done", progress: 1 });
      await reload();
      setNotice(job.kind === "attachment" ? "Original film attached." : "Upload complete.");
      window.setTimeout(() => updateJobs((list) => list.filter((entry) => entry.id !== job.id)), 2600);
    } catch (err) {
      if (paused.current.has(job.id)) {
        updateJob(job.id, { status: "paused" });
        return;
      }
      updateJob(job.id, {
        status: "error",
        error: err instanceof Error ? err.message : "The upload failed.",
      });
    }
  }

  function pump() {
    if (running.current >= 2) return;
    const nextJob = jobsRef.current.find((job) => job.status === "queued" && !claimed.current.has(job.id));
    if (!nextJob) return;
    claimed.current.add(nextJob.id);
    running.current += 1;
    updateJob(nextJob.id, { status: "uploading" });
    void runJob(nextJob).finally(() => {
      claimed.current.delete(nextJob.id);
      running.current -= 1;
      pump();
    });
  }

  useEffect(() => {
    pump();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs]);

  function addFiles(list: FileList | null) {
    if (!list || !list.length) return;
    const queued: UploadJob[] = [];
    Array.from(list).forEach((file) => {
      const kind = detectKind(file);
      if (!kind) {
        setNotice(`${file.name} is not a supported photo or video.`, "error");
        return;
      }
      if (file.size === 0) {
        setNotice(`${file.name} is empty.`, "error");
        return;
      }
      queued.push({
        id: newId(),
        file,
        name: file.name,
        size: file.size,
        kind,
        chapterId: uploadChapter || chapters[0]?.id,
        status: "queued",
        progress: 0,
        offset: 0,
      });
    });
    if (queued.length) {
      updateJobs((prev) => [...prev, ...queued]);
      setNotice(`${queued.length} file${queued.length === 1 ? "" : "s"} queued. You can pause or retry each one.`);
    }
    if (mainInput.current) mainInput.current.value = "";
  }

  async function startAttachment(file: File, item: ManagerItem) {
    if (!/\.(mp4|mov|m4v|webm|ogv|mkv|avi)$/i.test(file.name)) {
      setNotice("Attach a video file (MP4, MOV or WebM).", "error");
      return;
    }
    setEditing(null);
    updateJobs((prev) => [
      ...prev,
      {
        id: newId(),
        file,
        name: file.name,
        size: file.size,
        kind: "attachment",
        attachmentFor: item.id,
        status: "queued",
        progress: 0,
        offset: 0,
      },
    ]);
    setNotice(`Attaching ${file.name} without leaving the gallery.`);
  }

  async function pauseJob(job: UploadJob) {
    paused.current.add(job.id);
    xhrs.current.get(job.id)?.abort();
    updateJob(job.id, { status: "paused" });
  }

  function resumeJob(job: UploadJob) {
    paused.current.delete(job.id);
    updateJob(job.id, { status: "queued", error: undefined });
  }

  async function discardJob(job: UploadJob) {
    paused.current.add(job.id);
    xhrs.current.get(job.id)?.abort();
    if (job.uploadId && job.status !== "done") {
      await fetch(`/api/studio/uploads/${job.uploadId}/fail`, { method: "POST" }).catch(() => undefined);
    }
    paused.current.delete(job.id);
    updateJobs((list) => list.filter((entry) => entry.id !== job.id));
    await reload();
  }

  const ordered = [...items].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
  const groups = chapters.map((chapter) => ({
    chapter,
    items: ordered.filter((item) => item.chapter_id === chapter.id),
  }));
  const loose = ordered.filter((item) => !chapters.some((chapter) => chapter.id === item.chapter_id));

  async function persist(groupsById: Record<string, string[]>) {
    const res = await fetch(`/api/studio/galleries/${gallery.id}/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chapters: chapters.map((chapter) => ({ id: chapter.id, itemIds: groupsById[chapter.id] ?? [] })),
      }),
    });
    if (!res.ok) {
      setNotice("Could not save that order.", "error");
      return;
    }
    setDragging(null);
    setDragOver(null);
    await reload();
  }

  function currentGroups(): Record<string, string[]> {
    const map: Record<string, string[]> = {};
    chapters.forEach((chapter) => {
      map[chapter.id] = ordered.filter((item) => item.chapter_id === chapter.id).map((item) => item.id);
    });
    return map;
  }

  async function moveWithin(item: ManagerItem, direction: -1 | 1) {
    if (!item.chapter_id) return;
    const map = currentGroups();
    const list = [...(map[item.chapter_id] ?? [])];
    const index = list.indexOf(item.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    map[item.chapter_id] = list;
    await persist(map);
  }

  async function dropOn(target: ManagerItem) {
    if (!dragging || dragging === target.id || !target.chapter_id) return;
    const source = ordered.find((item) => item.id === dragging);
    if (!source) return;
    const map = currentGroups();
    for (const key of Object.keys(map)) {
      map[key] = map[key].filter((id) => id !== dragging);
    }
    const targetList = map[target.chapter_id] ?? [];
    const index = targetList.indexOf(target.id);
    targetList.splice(index < 0 ? targetList.length : index, 0, dragging);
    map[target.chapter_id] = targetList;
    await persist(map);
  }

  async function setCover(item: ManagerItem) {
    const result = await patchGallery({ coverItemId: item.id });
    if (!result.ok) setNotice(result.error ?? "Could not set the cover.", "error");
    else setNotice("Cover updated.");
  }

  function openEditor(item: ManagerItem) {
    setEditing(item);
    setEditTitle(item.title ?? "");
    setEditChapter(item.chapter_id ?? chapters[0]?.id ?? "");
  }

  async function saveEditor() {
    if (!editing) return;
    setEditBusy(true);
    const res = await fetch(`/api/studio/items/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle, chapterId: editChapter || null }),
    });
    const data = await res.json().catch(() => null);
    setEditBusy(false);
    if (!res.ok) {
      setNotice(apiError(data, "Could not update this item."), "error");
      return;
    }
    setEditing(null);
    await reload();
    setNotice("Item updated.");
  }

  async function uploadPoster(file: File) {
    if (!editing) return;
    setPosterBusy(true);
    const res = await fetch(`/api/studio/items/${editing.id}/poster`, {
      method: "POST",
      headers: { "Content-Type": file.type || "image/jpeg" },
      body: file,
    });
    const data = await res.json().catch(() => null);
    setPosterBusy(false);
    if (!res.ok) {
      setNotice(apiError(data, "Could not set that poster."), "error");
      return;
    }
    await reload();
    setNotice("Poster updated.");
    setEditing(null);
  }

  async function deleteItem() {
    if (!deleting) return;
    setDeleteBusy(true);
    const res = await fetch(`/api/studio/items/${deleting.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    setDeleteBusy(false);
    if (!res.ok) {
      setNotice(apiError(data, "Could not delete this item."), "error");
      return;
    }
    setDeleting(null);
    await reload();
    setNotice("Item removed.");
  }

  const activeJobs = jobs.filter((job) => job.status !== "done");
  const readyCount = items.filter((item) => item.status === "ready").length;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label text-gold-deep">Media</p>
          <h2 className="mt-2 font-serif text-3xl text-teal-950">The frames, in order</h2>
          <p className="mt-1.5 text-[12px] text-ink/45">
            {readyCount} ready · drag tiles or use the arrows to reorder within and across chapters.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="upload-chapter">Chapter for new uploads</label>
          <select
            id="upload-chapter"
            value={uploadChapter}
            onChange={(e) => setUploadChapter(e.target.value)}
            className="field h-10 px-3 py-2 text-[11px]"
          >
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>Add to · {chapter.title}</option>
            ))}
          </select>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="btn-turquoise h-10 w-full justify-center px-4 py-2 text-[10px] sm:w-auto"
              aria-expanded={menuOpen}
            >
              <Plus className="h-3.5 w-3.5" /> Add media <ChevronDown className="h-3 w-3" />
            </button>
            {menuOpen && (
              <>
                <button type="button" aria-label="Close menu" className="fixed inset-0 z-20 cursor-default" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-sm border border-teal-900/15 bg-cream-soft shadow-lift">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      mainInput.current?.click();
                    }}
                    className="flex w-full items-start gap-3 border-b border-teal-900/10 px-4 py-3.5 text-left transition hover:bg-cream"
                  >
                    <Upload className="mt-0.5 h-4 w-4 text-teal-900" strokeWidth={1.7} />
                    <span>
                      <span className="block text-[12px] font-semibold text-teal-950">Upload files</span>
                      <span className="mt-0.5 block text-[10.5px] text-ink/45">Photos and films, resumable and batched.</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setYoutubeOpen(true);
                    }}
                    className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-cream"
                  >
                    <Youtube className="mt-0.5 h-4 w-4 text-red-700" strokeWidth={1.7} />
                    <span>
                      <span className="block text-[12px] font-semibold text-teal-950">Add YouTube link</span>
                      <span className="mt-0.5 block text-[10.5px] text-ink/45">Official player, with an optional original file.</span>
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <input
        ref={mainInput}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(e) => addFiles(e.target.files)}
      />

      {activeJobs.length > 0 && (
        <section className="mt-5 overflow-hidden rounded-sm border border-teal-900/10 bg-white">
          <div className="flex items-center justify-between border-b border-teal-900/10 px-4 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-900/50">
              Uploads · {activeJobs.length}
            </p>
            <p className="text-[10px] text-ink/35">Two at a time · pausing keeps progress</p>
          </div>
          <div className="divide-y divide-teal-900/10">
            {activeJobs.map((job) => (
              <div key={job.id} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] bg-teal-950 text-cream/70">
                    {job.kind === "photo" ? <ImageIcon className="h-4 w-4" /> : <Film className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-teal-950">{job.name}</p>
                    <p className="mt-0.5 text-[10px] text-ink/40">
                      {formatBytes(job.size)}
                      {job.kind === "attachment" ? " · original film" : job.chapterId ? ` · ${chapters.find((c) => c.id === job.chapterId)?.title ?? ""}` : ""}
                      {job.status === "processing" ? " · processing previews" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {job.status === "uploading" && (
                      <button type="button" onClick={() => pauseJob(job)} className="p-1.5 text-teal-900/50 hover:text-teal-950" aria-label="Pause upload">
                        <Pause className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {job.status === "paused" && (
                      <button type="button" onClick={() => resumeJob(job)} className="p-1.5 text-teal-900/60 hover:text-teal-950" aria-label="Resume upload">
                        <Play className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {job.status === "error" && (
                      <button type="button" onClick={() => resumeJob(job)} className="p-1.5 text-amber-800 hover:text-amber-900" aria-label="Retry upload">
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {job.status === "processing" || job.status === "uploading" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-900/50" />
                    ) : (
                      <button type="button" onClick={() => discardJob(job)} className="p-1.5 text-teal-900/30 hover:text-red-800" aria-label="Remove upload">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-teal-900/10">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        job.status === "error" ? "bg-red-700" : job.status === "paused" ? "bg-gold" : "bg-turquoise-deep",
                      )}
                      style={{ width: `${Math.max(2, Math.round(job.progress * 100))}%` }}
                    />
                  </div>
                  <span className="w-9 text-right text-[10px] tabular-nums text-ink/45">
                    {Math.round(job.progress * 100)}%
                  </span>
                </div>
                {job.error && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-[10px] text-red-800">
                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> {job.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 space-y-9">
        {groups.map(({ chapter, items: chapterItems }) => (
          <section key={chapter.id}>
            <div className="flex items-end justify-between border-b border-teal-900/15 pb-3">
              <div className="flex items-baseline gap-3">
                <span className="font-serif text-[11px] text-gold-deep">
                  {String(chapters.findIndex((c) => c.id === chapter.id) + 1).padStart(2, "0")}
                </span>
                <h3 className="font-serif text-[23px] leading-tight text-teal-950">{chapter.title}</h3>
              </div>
              <span className="text-[9.5px] uppercase tracking-[0.16em] text-teal-900/35">
                {chapterItems.length} item{chapterItems.length === 1 ? "" : "s"}
              </span>
            </div>

            {chapterItems.length === 0 ? (
              <div className="mt-4 flex flex-col items-center justify-center rounded-sm border border-dashed border-teal-900/15 bg-white/40 px-4 py-10 text-center">
                <ImageIcon className="h-5 w-5 text-teal-900/20" />
                <p className="mt-2 text-[11.5px] text-ink/40">No media in this chapter yet.</p>
                <button
                  type="button"
                  onClick={() => {
                    setUploadChapter(chapter.id);
                    mainInput.current?.click();
                  }}
                  className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-900/60 underline underline-offset-4 hover:text-teal-950"
                >
                  Add media here
                </button>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {chapterItems.map((item, index) => (
                  <MediaTile
                    key={item.id}
                    gallery={gallery}
                    item={item}
                    index={index}
                    total={chapterItems.length}
                    isDragging={dragging === item.id}
                    isOver={dragOver === item.id}
                    onDragStart={() => setDragging(item.id)}
                    onDragEnd={() => {
                      setDragging(null);
                      setDragOver(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(item.id);
                    }}
                    onDrop={() => dropOn(item)}
                    onMove={(dir) => moveWithin(item, dir)}
                    onCover={() => setCover(item)}
                    onEdit={() => openEditor(item)}
                    onDelete={() => setDeleting(item)}
                    onView={() => setViewing(item)}
                  />
                ))}
              </div>
            )}
          </section>
        ))}

        {loose.length > 0 && (
          <section>
            <div className="border-b border-teal-900/15 pb-3">
              <h3 className="font-serif text-[23px] text-teal-950">Unsorted</h3>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {loose.map((item, index) => (
                <MediaTile
                  key={item.id}
                  gallery={gallery}
                  item={item}
                  index={index}
                  total={loose.length}
                  isDragging={dragging === item.id}
                  isOver={dragOver === item.id}
                  onDragStart={() => setDragging(item.id)}
                  onDragEnd={() => {
                    setDragging(null);
                    setDragOver(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(item.id);
                  }}
                  onDrop={() => dropOn(item)}
                  onMove={(dir) => moveWithin(item, dir)}
                  onCover={() => setCover(item)}
                  onEdit={() => openEditor(item)}
                  onDelete={() => setDeleting(item)}
                  onView={() => setViewing(item)}
                />
              ))}
            </div>
          </section>
        )}

        {items.length === 0 && (
          <div className="rounded-sm border border-dashed border-teal-900/20 bg-white/50 px-6 py-14 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 bg-cream">
              <Upload className="h-5 w-5 text-gold-deep" strokeWidth={1.5} />
            </span>
            <h3 className="mt-4 font-serif text-2xl text-teal-950">Add the first frames.</h3>
            <p className="mx-auto mt-2 max-w-sm text-[12px] leading-relaxed text-ink/45">
              Upload a batch of photographs or films, or add a YouTube link. Preview images are generated
              automatically; originals are preserved untouched.
            </p>
            <button type="button" onClick={() => mainInput.current?.click()} className="btn-primary mt-5">
              <Upload className="h-4 w-4" /> Upload files
            </button>
          </div>
        )}
      </div>

      <YoutubeDialog
        open={youtubeOpen}
        onClose={() => setYoutubeOpen(false)}
        galleryId={gallery.id}
        chapters={chapters}
        defaultChapterId={uploadChapter || chapters[0]?.id || ""}
        onAdded={reload}
        setNotice={setNotice}
      />

      <Modal open={Boolean(editing)} onClose={() => !editBusy && setEditing(null)} eyebrow={editing?.kind === "youtube" ? "YouTube film" : editing?.kind === "video" ? "Uploaded film" : "Photograph"} title="Edit media">
        {editing && (
          <div className="space-y-4">
            <div>
              <label htmlFor="item-title" className="field-label">Title</label>
              <input id="item-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="field mt-2" maxLength={160} />
            </div>
            <div>
              <label htmlFor="item-chapter" className="field-label">Chapter</label>
              <select id="item-chapter" value={editChapter} onChange={(e) => setEditChapter(e.target.value)} className="field mt-2">
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>{chapter.title}</option>
                ))}
              </select>
            </div>

            <div className="rounded-sm border border-teal-900/10 bg-cream-soft p-3 text-[11px] text-ink/45">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{formatBytes(editing.size_bytes)}{editing.width ? ` · ${editing.width}×${editing.height}` : ""}</span>
                {editing.has_attachment && editing.attachment_name && (
                  <span className="text-teal-900/60">Original · {editing.attachment_name} ({formatBytes(editing.attachment_size ?? 0)})</span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {editing.status === "ready" && (
                  <button type="button" onClick={() => setCover(editing)} className="btn-ghost h-8 px-2.5 text-[10px]">
                    <Star className="h-3 w-3" /> Cover
                  </button>
                )}
                {editing.status === "ready" && (editing.kind !== "youtube" || editing.has_attachment) && (
                  <a href={mediaApi(gallery.slug, editing.id, "file")} className="btn-ghost h-8 px-2.5 text-[10px]" download>
                    <Download className="h-3 w-3" /> Original
                  </a>
                )}
                {editing.kind === "youtube" && (
                  <button type="button" onClick={() => attachInput.current?.click()} className="btn-ghost h-8 px-2.5 text-[10px]">
                    <Link2 className="h-3 w-3" /> {editing.has_attachment ? "Replace original" : "Attach original"}
                  </button>
                )}
                {editing.kind === "video" && (
                  <button type="button" onClick={() => posterInput.current?.click()} className="btn-ghost h-8 px-2.5 text-[10px]" disabled={posterBusy}>
                    {posterBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />} {editing.has_poster ? "Replace poster" : "Set poster"}
                  </button>
                )}
              </div>
              <input
                ref={attachInput}
                type="file"
                accept="video/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void startAttachment(file, editing);
                  e.target.value = "";
                }}
              />
              <input
                ref={posterInput}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadPoster(file);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-teal-900/10 pt-4">
              <button
                type="button"
                onClick={() => {
                  setDeleting(editing);
                  setEditing(null);
                }}
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-800/80 hover:text-red-900"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
                <button type="button" onClick={saveEditor} disabled={editBusy} className="btn-primary px-4 py-2.5 text-[10px] disabled:opacity-60">
                  {editBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(deleting)} onClose={() => !deleteBusy && setDeleting(null)} eyebrow="Remove media" title={`Delete “${deleting?.title || deleting?.original_name || "this item"}”?`}>
        <p className="text-[13px] leading-relaxed text-ink/60">
          The preview and the stored original are deleted. If it was the cover, another item becomes the cover.
          This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setDeleting(null)} className="btn-ghost">Keep it</button>
          <button
            type="button"
            onClick={deleteItem}
            disabled={deleteBusy}
            className="inline-flex items-center gap-2 rounded-sm bg-red-800 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white hover:bg-red-900 disabled:opacity-60"
          >
            {deleteBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Delete
          </button>
        </div>
      </Modal>

      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing?.title || viewing?.original_name || "Media preview"} eyebrow="Studio playback" className="sm:max-w-3xl">
        {viewing && (
          <div className="overflow-hidden rounded-sm bg-black">
            {viewing.kind === "photo" ? (
              itemLarge(gallery.slug, viewing) ? (
                <img src={itemLarge(gallery.slug, viewing) ?? ""} alt="" className="max-h-[70dvh] w-full object-contain" />
              ) : (
                <p className="p-8 text-center text-sm text-cream/50">Preview still processing.</p>
              )
            ) : viewing.kind === "youtube" && viewing.youtube_id ? (
              <div className="aspect-video w-full">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${viewing.youtube_id}?rel=0`}
                  title={viewing.title ?? "YouTube film"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            ) : viewing.status === "ready" ? (
              <video
                controls
                playsInline
                preload="metadata"
                poster={viewing.has_poster ? mediaApi(gallery.slug, viewing.id, "poster") : undefined}
                src={`${mediaApi(gallery.slug, viewing.id, "file")}?inline=1`}
                className="max-h-[70dvh] w-full bg-black"
              />
            ) : (
              <p className="p-8 text-center text-sm text-cream/50">This file is not playable yet.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function MediaTile({
  gallery,
  item,
  index,
  total,
  isDragging,
  isOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onMove,
  onCover,
  onEdit,
  onDelete,
  onView,
}: {
  gallery: ManagerGallery;
  item: ManagerItem;
  index: number;
  total: number;
  isDragging: boolean;
  isOver: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: () => void;
  onMove: (direction: -1 | 1) => void;
  onCover: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}) {
  const src = itemThumb(gallery.slug, item);
  const isCover = gallery.cover_item_id === item.id;
  const ready = item.status === "ready";

  return (
    <article
      draggable={ready}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={cn(
        "group overflow-hidden rounded-sm border bg-white transition",
        isCover ? "border-gold/70" : "border-teal-900/10",
        isDragging && "opacity-40",
        isOver && "ring-2 ring-turquoise",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-teal-950">
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-cream/30">
            {item.kind === "photo" ? <ImageIcon className="h-5 w-5" /> : <Film className="h-5 w-5" />}
            <span className="text-[8px] uppercase tracking-[0.16em]">{item.status === "uploading" ? "Uploading" : item.status === "failed" ? "Failed" : "No preview"}</span>
          </div>
        )}

        {item.kind !== "photo" && (
          <button type="button" onClick={onView} className="absolute inset-0 flex items-center justify-center bg-teal-950/20 transition hover:bg-teal-950/35" aria-label="Play film">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cream/90 text-teal-950 shadow">
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            </span>
          </button>
        )}

        <div className="absolute left-1.5 top-1.5 flex flex-wrap gap-1">
          <span className="rounded-[2px] bg-teal-950/75 px-1.5 py-0.5 text-[7.5px] font-semibold uppercase tracking-[0.12em] text-cream/70">
            {item.kind === "photo" ? "Photo" : item.kind === "youtube" ? "YouTube" : "Film"}
          </span>
          {isCover && (
            <span className="flex items-center gap-0.5 rounded-[2px] bg-gold px-1.5 py-0.5 text-[7.5px] font-bold uppercase tracking-[0.1em] text-teal-950">
              <Star className="h-2 w-2 fill-current" /> Cover
            </span>
          )}
        </div>
        {item.status !== "ready" && (
          <span className="absolute right-1.5 top-1.5 rounded-[2px] bg-amber-500/90 px-1.5 py-0.5 text-[7.5px] font-bold uppercase tracking-[0.1em] text-teal-950">
            {item.status}
          </span>
        )}
      </div>

      <div className="p-2.5">
        <button type="button" onClick={onEdit} className="block w-full truncate text-left text-[11.5px] font-medium text-teal-950 hover:text-teal-800" title={item.title ?? undefined}>
          {item.title || item.original_name || "Untitled"}
        </button>
        <div className="mt-0.5 flex items-center justify-between text-[9px] text-ink/35">
          <span>{item.size_bytes ? formatBytes(item.size_bytes) : "—"}</span>
          <span>#{index + 1}</span>
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-teal-900/10 pt-2">
          <div className="flex items-center">
            <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="p-1 text-teal-900/35 disabled:opacity-20 hover:text-teal-950" aria-label="Move earlier">
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} className="p-1 text-teal-900/35 disabled:opacity-20 hover:text-teal-950" aria-label="Move later">
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center">
            <button type="button" onClick={onCover} disabled={!ready || isCover} className="p-1 text-teal-900/30 disabled:opacity-20 hover:text-gold-deep" aria-label="Set as cover" title="Set as cover">
              <Star className={cn("h-3.5 w-3.5", isCover && "fill-current text-gold-deep")} />
            </button>
            <button type="button" onClick={onEdit} className="p-1 text-teal-900/30 hover:text-teal-950" aria-label="Edit item" title="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={onDelete} className="p-1 text-teal-900/25 hover:text-red-800" aria-label="Delete item" title="Delete">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
