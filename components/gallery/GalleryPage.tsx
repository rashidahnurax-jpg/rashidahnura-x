"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  Camera,
  Check,
  Clapperboard,
  Download,
  Film,
  Heart,
  ImageOff,
  Loader2,
  Play,
  Settings2,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { CopyButton, WhatsAppShare } from "@/components/ui/CopyButton";
import { AccessBadgeLight } from "@/components/ui/Badges";
import { cn, formatDate } from "@/lib/format";
import { apiError } from "@/components/studio/manager/ManagerTypes";
import { Lightbox } from "./Lightbox";
import { FilmViewer } from "./FilmViewer";
import { SelectionPanel } from "./SelectionPanel";
import { EmailGate } from "./EmailGate";
import {
  isFilm,
  itemAspect,
  itemCanDownload,
  itemDisplaySize,
  itemDownloadHref,
  itemLargeSrc,
  itemThumbSrc,
  prettySize,
  type GalleryChapter,
  type GalleryItem,
  type GalleryMeta,
  type GalleryView,
} from "./types";

type ChapterSection = { id: string; title: string; position: number; items: GalleryItem[] };

export function GalleryPage({
  gallery,
  chapters,
  items,
  meta,
}: {
  gallery: GalleryView;
  chapters: GalleryChapter[];
  items: GalleryItem[];
  meta: GalleryMeta;
}) {
  const [origin, setOrigin] = useState("");
  const [canDownload, setCanDownload] = useState(gallery.canDownload);
  const [guestEmail, setGuestEmail] = useState(gallery.email);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [film, setFilm] = useState<GalleryItem | null>(null);
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const pendingAction = useRef<(() => void) | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const storageKey = `nurax-selection-${gallery.slug}`;
  const photos = useMemo(() => items.filter((item) => item.kind === "photo"), [items]);
  const films = useMemo(() => items.filter(isFilm), [items]);
  const shareUrl = origin ? `${origin}/g/${gallery.slug}` : "";

  const chapterSections = useMemo<ChapterSection[]>(() => {
    const sections = chapters
      .map((chapter) => ({ ...chapter, items: items.filter((item) => item.chapter_id === chapter.id) }))
      .filter((section) => section.items.length > 0);
    const known = new Set(chapters.map((chapter) => chapter.id));
    const loose = items.filter((item) => !item.chapter_id || !known.has(item.chapter_id));
    if (loose.length) {
      sections.push({ id: "more", title: "More from this gallery", position: chapters.length, items: loose });
    }
    return sections;
  }, [chapters, items]);

  const selectedItems = useMemo(() => items.filter((item) => selection.has(item.id)), [items, selection]);
  const policyDownloadableSelected = useMemo(
    () =>
      selectedItems.filter((item) =>
        item.kind === "photo"
          ? gallery.allow_photo_downloads
          : gallery.allow_video_downloads && (item.kind === "video" || item.has_attachment),
      ),
    [selectedItems, gallery],
  );

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((id): id is string => typeof id === "string" && items.some((item) => item.id === id));
          setSelection(new Set(valid));
        }
      }
    } catch {
      /* selection persistence is best-effort */
    }
    setHydrated(true);
  }, [storageKey, items]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(Array.from(selection)));
    } catch {
      /* ignore quota errors */
    }
  }, [selection, hydrated, storageKey]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3800);
  }

  function toggleSelect(id: string) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function chapterName(chapterId: string | null): string {
    if (!chapterId) return "The gallery";
    return chapters.find((chapter) => chapter.id === chapterId)?.title ?? "The gallery";
  }

  function requireDownloads(action: () => void) {
    if (canDownload) {
      action();
      return;
    }
    if (lightboxIndex !== null) setLightboxIndex(null);
    setFilm(null);
    pendingAction.current = action;
    setEmailOpen(true);
  }

  function handleDownload(item: GalleryItem) {
    const href = itemDownloadHref(gallery, item);
    requireDownloads(() => {
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    });
  }

  async function downloadZip(ids: string[]) {
    if (!ids.length) return;
    setZipBusy(true);
    try {
      const res = await fetch(`/api/g/${gallery.slug}/download-zip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: ids }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const code = data && typeof data === "object" && "code" in data ? (data as { code?: string }).code : undefined;
        if (res.status === 403 && code === "email_required") {
          pendingAction.current = () => downloadZip(ids);
          setEmailOpen(true);
          return;
        }
        notify(apiError(data, "Could not prepare that archive."));
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") ?? "";
      const nameMatch = /filename="?([^";]+)"?/i.exec(disposition);
      const filename = nameMatch?.[1] ?? `${gallery.slug}-selection.zip`;
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
      notify(`Archive ready · ${prettySize(blob.size)}`);
    } catch {
      notify("Network error while preparing the archive.");
    } finally {
      setZipBusy(false);
    }
  }

  function requestZip(ids: string[]) {
    if (!canDownload) {
      pendingAction.current = () => downloadZip(ids);
      setEmailOpen(true);
      return;
    }
    void downloadZip(ids);
  }

  function handleUnlocked(email: string) {
    setGuestEmail(email);
    setCanDownload(true);
    setEmailOpen(false);
    const action = pendingAction.current;
    pendingAction.current = null;
    if (action) setTimeout(action, 60);
  }

  const downloadsCopy = gallery.allow_photo_downloads
    ? gallery.allow_video_downloads
      ? "Photos & films downloadable"
      : "Photos downloadable"
    : gallery.allow_video_downloads
      ? "Films downloadable"
      : "View only";

  const watchLabel = gallery.kind === "flagship" ? "Watch lecture" : films.length === 1 ? "Watch film" : "Watch films";

  return (
    <div className={cn("min-h-dvh bg-cream-soft", selectedItems.length > 0 && "pb-24")}>
      <SiteBar gallery={gallery} films={films.length} shareUrl={shareUrl} />

      {gallery.isOwnerPreview && (
        <div className="border-b border-gold/30 bg-gold/[0.08]">
          <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-deep">
              <ShieldCheck className="h-3.5 w-3.5" /> Owner preview — access gates are bypassed
            </p>
            <Link
              href={`/studio/g/${gallery.id}`}
              className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-900/60 hover:text-teal-900"
            >
              Manage gallery <Settings2 className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}

      {gallery.kind === "flagship" ? (
        <FlagshipHero gallery={gallery} films={films.length} shareUrl={shareUrl} downloadsCopy={downloadsCopy} watchLabel={watchLabel} />
      ) : (
        <StandardHero gallery={gallery} films={films.length} shareUrl={shareUrl} downloadsCopy={downloadsCopy} watchLabel={watchLabel} />
      )}

      {gallery.kind === "flagship" && (
        <section className="mx-auto max-w-[1100px] px-5 py-14 sm:px-8 lg:grid lg:grid-cols-[340px_1fr] lg:items-center lg:gap-12 lg:py-20">
          <div className="relative mx-auto w-full max-w-sm lg:mx-0">
            <div className="overflow-hidden rounded-sm border border-gold/30 bg-cream p-2 shadow-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/portrait-1200.jpg"
                alt={`Portrait of ${meta.lecturer ?? "the inaugural lecturer"}`}
                className="aspect-square w-full rounded-[1px] object-cover object-top"
              />
            </div>
            <p className="mt-3 text-center text-[8.5px] font-semibold uppercase tracking-[0.24em] text-teal-900/40 lg:text-left">
              The 65th inaugural lecturer
            </p>
          </div>
          <div>
            <p className="label text-gold-deep">Meet the Inaugural Lecturer</p>
            <h2 className="mt-3 font-serif text-[30px] leading-[1.05] text-teal-950 sm:text-[38px]">
              {meta.lecturer ?? "The inaugural lecturer."}
            </h2>
            <p className="mt-3 font-serif text-[17px] italic text-gold-deep">
              {meta.lectureTitle ? `“${meta.lectureTitle}”` : "A lecture delivered in full academic dress."}
            </p>
            {gallery.description && (
              <p className="mt-4 max-w-2xl text-[13.5px] leading-relaxed text-ink/60">{gallery.description}</p>
            )}
            <dl className="mt-6 grid gap-x-8 gap-y-3 border-t border-teal-900/10 pt-5 text-[11px] sm:grid-cols-2">
              {meta.series && (
                <div>
                  <dt className="text-[8.5px] font-semibold uppercase tracking-[0.18em] text-teal-900/35">Series</dt>
                  <dd className="mt-1 text-teal-950">{meta.series}</dd>
                </div>
              )}
              {meta.institution && (
                <div>
                  <dt className="text-[8.5px] font-semibold uppercase tracking-[0.18em] text-teal-900/35">Institution</dt>
                  <dd className="mt-1 text-teal-950">{meta.institution}</dd>
                </div>
              )}
              {meta.venue && (
                <div>
                  <dt className="text-[8.5px] font-semibold uppercase tracking-[0.18em] text-teal-900/35">Venue</dt>
                  <dd className="mt-1 text-teal-950">{meta.venue}</dd>
                </div>
              )}
              {gallery.published_at && (
                <div>
                  <dt className="text-[8.5px] font-semibold uppercase tracking-[0.18em] text-teal-900/35">Published</dt>
                  <dd className="mt-1 text-teal-950">{formatDate(gallery.published_at)}</dd>
                </div>
              )}
            </dl>
          </div>
        </section>
      )}

      {films.length > 0 && (
        <section id="films" className="scroll-mt-28 bg-teal-950 text-cream">
          <div className="mx-auto max-w-[1320px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.3em] text-gold">
                  <Clapperboard className="h-3.5 w-3.5" /> Films
                </p>
                <h2 className="mt-3 font-serif text-[30px] leading-none sm:text-[38px]">
                  {gallery.kind === "flagship" ? "Watch the lecture." : "The films."}
                </h2>
              </div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-cream/35">
                {films.length} {films.length === 1 ? "film" : "films"} · free to watch
              </p>
            </div>

            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              {films.map((item, index) => {
                const poster = item.poster_url ?? item.thumb_url;
                const allowed = itemCanDownload(gallery, item, true);
                const size = itemDisplaySize(item);
                return (
                  <article
                    key={item.id}
                    className="group overflow-hidden rounded-sm border border-cream/10 bg-cream/[0.03] animate-fadeUp motion-reduce:animate-none"
                    style={{ animationDelay: `${Math.min(index * 90, 360)}ms` }}
                  >
                    <button
                      type="button"
                      onClick={() => setFilm(item)}
                      className="relative block w-full overflow-hidden"
                      aria-label={`Play ${item.title}`}
                    >
                      <div className="aspect-video w-full bg-teal-900">
                        {poster ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={poster} alt="" loading="lazy" className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-[1.02] group-hover:opacity-100" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-cream/25">
                            <Film className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-cream/30 bg-teal-950/55 text-cream backdrop-blur transition group-hover:scale-105 group-hover:border-turquoise group-hover:text-turquoise">
                          <Play className="ml-0.5 h-5 w-5 fill-current" />
                        </span>
                      </span>
                      <span className="absolute left-3 top-3 rounded-full bg-teal-950/60 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-cream/70 backdrop-blur">
                        {item.kind === "youtube" ? "YouTube" : "Film"}
                      </span>
                    </button>
                    <div className="flex flex-wrap items-end justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate font-serif text-[18px] leading-tight">{item.title}</p>
                        <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-cream/35">
                          {chapterName(item.chapter_id)}
                          {size > 0 ? ` · ${prettySize(size)} original` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button type="button" onClick={() => setFilm(item)} className="btn-turquoise px-4 py-2 text-[9.5px]">
                          <Play className="h-3 w-3 fill-current" /> Watch film
                        </button>
                        {allowed && (
                          <button
                            type="button"
                            onClick={() => handleDownload(item)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-cream/20 px-2.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-cream/55 transition hover:border-cream/40 hover:text-cream"
                          >
                            <Download className="h-3 w-3" />
                            {size > 0 ? prettySize(size) : "Original"}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <nav className="sticky top-14 z-20 border-b border-teal-900/10 bg-cream-soft/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1320px] items-center gap-1.5 overflow-x-auto px-4 py-2.5 sm:px-6 lg:px-8 [scrollbar-width:none]">
          {chapterSections.map((section, index) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="shrink-0 rounded-full border border-teal-900/10 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-teal-900/55 transition hover:border-teal-900/30 hover:text-teal-900"
            >
              <span className="mr-1.5 font-mono text-[8px] text-gold-deep">{String(index + 1).padStart(2, "0")}</span>
              {section.title}
            </a>
          ))}
          {films.length > 0 && (
            <a
              href="#films"
              className="shrink-0 rounded-full border border-teal-900/10 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-teal-900/55 transition hover:border-teal-900/30 hover:text-teal-900"
            >
              <Film className="mr-1 inline h-2.5 w-2.5 text-gold-deep" /> Films
            </a>
          )}
        </div>
      </nav>

      <main id="gallery" className="mx-auto max-w-[1320px] scroll-mt-28 px-2.5 sm:px-6 lg:px-8">
        {chapterSections.length === 0 && photos.length === 0 && films.length === 0 ? (
          <div className="py-24 text-center">
            <ImageOff className="mx-auto h-8 w-8 text-teal-900/20" />
            <p className="mt-3 font-serif text-[20px] text-teal-950">The gallery is being prepared.</p>
            <p className="mt-1 text-[12px] text-ink/40">The studio hasn't added media yet. Check back soon.</p>
          </div>
        ) : (
          chapterSections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-28 py-10 sm:py-12 animate-fadeUp motion-reduce:animate-none"
              style={{ animationDelay: `${Math.min(index * 80, 320)}ms` }}
            >
              <div className="mb-5 flex items-end justify-between gap-4 px-1">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-gold-deep">{String(index + 1).padStart(2, "0")}</span>
                  <h2 className="font-serif text-[24px] leading-none text-teal-950 sm:text-[30px]">{section.title}</h2>
                </div>
                <span className="shrink-0 text-[9px] uppercase tracking-[0.14em] text-teal-900/30">
                  {section.items.length} {section.items.length === 1 ? "frame" : "frames"}
                </span>
              </div>
              <div className="columns-2 gap-2.5 md:columns-3 md:gap-3">
                {section.items.map((item) => (
                  <Tile
                    key={item.id}
                    gallery={gallery}
                    item={item}
                    canDownload={canDownload}
                    selected={selection.has(item.id)}
                    onToggleSelect={toggleSelect}
                    onOpen={() => {
                      if (isFilm(item)) setFilm(item);
                      else setLightboxIndex(photos.findIndex((photo) => photo.id === item.id));
                    }}
                    onDownload={handleDownload}
                  />
                ))}
              </div>
            </section>
          ))
        )}

        <div className="flex flex-col items-center gap-1.5 py-14 text-center">
          <Logo href="/" compact />
          <p className="mt-2 max-w-sm text-[10px] leading-relaxed text-ink/35">
            Shared privately by {gallery.studio_name}. Previews are lightweight; full-resolution originals stay intact for
            download.
          </p>
          {gallery.expires_at && (
            <p className="text-[9px] uppercase tracking-[0.14em] text-teal-900/30">This link is available until {formatDate(gallery.expires_at)}</p>
          )}
        </div>
      </main>

      {selectedItems.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-cream/10 bg-teal-950 text-cream shadow-lift">
          <div className="mx-auto flex max-w-[1320px] items-center gap-3 px-4 py-3 sm:px-6">
            <button type="button" onClick={() => setSelectionOpen(true)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <span className="flex -space-x-2.5">
                {selectedItems.slice(0, 3).map((item) => {
                  const thumb = itemThumbSrc(gallery, item);
                  return (
                    <span key={item.id} className="h-9 w-9 overflow-hidden rounded-full border-2 border-teal-950 bg-teal-900">
                      {thumb && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" className="h-full w-full object-cover" />
                      )}
                    </span>
                  );
                })}
              </span>
              <span className="min-w-0">
                <span className="block text-[11.5px] font-semibold">
                  {selectedItems.length} in your selection
                </span>
                <span className="block truncate text-[9px] uppercase tracking-[0.12em] text-cream/35">
                  {policyDownloadableSelected.length} ready · free
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSelection(new Set())}
              className="hidden h-9 w-9 items-center justify-center rounded-full text-cream/35 transition hover:bg-cream/10 hover:text-cream sm:flex"
              aria-label="Clear selection"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setSelectionOpen(true)}
              className="hidden rounded-sm border border-cream/20 px-3.5 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-cream/70 transition hover:border-cream/45 hover:text-cream sm:inline-flex"
            >
              Review &amp; send
            </button>
            <button
              type="button"
              onClick={() => requestZip(policyDownloadableSelected.map((item) => item.id))}
              disabled={zipBusy || policyDownloadableSelected.length === 0}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-sm bg-turquoise px-3.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-teal-950 transition hover:bg-turquoise-light disabled:opacity-40"
            >
              {zipBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {zipBusy ? "Preparing…" : canDownload ? "Download ZIP" : "Download"}
            </button>
          </div>
        </div>
      )}

      {lightboxIndex !== null && photos[lightboxIndex] && (
        <Lightbox
          items={photos}
          index={lightboxIndex}
          gallery={gallery}
          chapterName={chapterName}
          canDownload={canDownload}
          selected={selection}
          onToggleSelect={toggleSelect}
          onClose={() => setLightboxIndex(null)}
          onIndex={setLightboxIndex}
          onDownload={handleDownload}
        />
      )}

      {film && (
        <FilmViewer
          item={film}
          gallery={gallery}
          canDownload={canDownload}
          chapterLabel={chapterName(film.chapter_id)}
          onClose={() => setFilm(null)}
          onDownload={handleDownload}
        />
      )}

      <SelectionPanel
        open={selectionOpen}
        onClose={() => setSelectionOpen(false)}
        gallery={gallery}
        items={items}
        selected={selection}
        canDownload={canDownload}
        emailKnown={guestEmail}
        onRemove={toggleSelect}
        onDownloadZip={(ids) => void downloadZip(ids)}
        onRequestDownloads={requestZip}
        onSubmitted={(count) => notify(`Selection sent · ${count} ${count === 1 ? "picture" : "pictures"}`)}
        zipBusy={zipBusy}
      />

      <EmailGate open={emailOpen} slug={gallery.slug} onClose={() => setEmailOpen(false)} onUnlocked={handleUnlocked} />

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex justify-center px-4">
          <p className="flex items-center gap-2 rounded-full bg-teal-950 px-4 py-2.5 text-[11px] text-cream shadow-lift animate-fadeUp">
            <Check className="h-3.5 w-3.5 text-turquoise" /> {toast}
          </p>
        </div>
      )}

      {!gallery.isOwnerPreview && <ViewTracker slug={gallery.slug} />}
    </div>
  );
}

function Tile({
  gallery,
  item,
  canDownload,
  selected,
  onToggleSelect,
  onOpen,
  onDownload,
}: {
  gallery: GalleryView;
  item: GalleryItem;
  canDownload: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onOpen: () => void;
  onDownload: (item: GalleryItem) => void;
}) {
  const src = itemLargeSrc(item);
  const film = isFilm(item);
  const photo = item.kind === "photo";
  const allowed =
    photo
      ? gallery.allow_photo_downloads
      : gallery.allow_video_downloads && (item.kind === "video" || item.has_attachment);

  return (
    <figure className="group relative mb-2.5 break-inside-avoid overflow-hidden rounded-sm bg-teal-900/[0.06] md:mb-3">
      <button type="button" onClick={onOpen} className="block w-full" aria-label={`${film ? "Play" : "Open"} ${item.title}`}>
        <span className="relative block w-full overflow-hidden" style={{ aspectRatio: itemAspect(item) }}>
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={item.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.015]"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-teal-900/20">
              <Camera className="h-5 w-5" />
            </span>
          )}
          <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-teal-950/70 via-teal-950/10 to-transparent p-2.5 pt-8 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
            <span className="line-clamp-1 block text-[9.5px] text-cream/85">{item.title}</span>
          </span>
          {film && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-cream/25 bg-teal-950/50 text-cream/90 backdrop-blur transition group-hover:border-turquoise group-hover:text-turquoise">
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              </span>
            </span>
          )}
        </span>
      </button>

      <div className="absolute right-1.5 top-1.5 flex gap-1">
        {photo && (
          <button
            type="button"
            onClick={() => onToggleSelect(item.id)}
            aria-pressed={selected}
            aria-label={selected ? `Remove ${item.title} from selection` : `Add ${item.title} to selection`}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur transition",
              selected
                ? "border-turquoise bg-turquoise text-teal-950"
                : "border-cream/20 bg-teal-950/45 text-cream/80 hover:bg-teal-950/70 hover:text-cream",
            )}
          >
            <Heart className={cn("h-3.5 w-3.5", selected && "fill-current")} />
          </button>
        )}
        {allowed && (
          <button
            type="button"
            onClick={() => onDownload(item)}
            aria-label={`Download ${item.title}`}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-cream/20 bg-teal-950/45 text-cream/80 backdrop-blur transition hover:bg-teal-950/70 hover:text-cream"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </figure>
  );
}

function SiteBar({ gallery, films, shareUrl }: { gallery: GalleryView; films: number; shareUrl: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-teal-900/10 bg-cream-soft/95 text-teal-950 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1320px] items-center justify-between gap-3 px-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Logo href="/" compact />
          <span className="hidden h-4 w-px bg-teal-900/15 sm:block" />
          <p className="hidden max-w-[36vw] truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-900/40 md:block">
            {gallery.title}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {films > 0 && (
            <a
              href="#films"
              className="hidden items-center gap-1.5 rounded-full border border-teal-900/15 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-teal-900/60 transition hover:border-teal-900/35 hover:text-teal-900 sm:inline-flex"
            >
              <Play className="h-3 w-3 fill-current text-gold-deep" /> Watch
            </a>
          )}
          {gallery.isOwnerPreview && (
            <Link
              href={`/studio/g/${gallery.id}`}
              className="hidden items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-gold-deep sm:inline-flex"
            >
              Manage
            </Link>
          )}
          {shareUrl && (
            <>
              <div className="hidden sm:block">
                <CopyButton value={shareUrl} className="px-3 py-2 text-[9.5px]" />
              </div>
              <div className="sm:hidden">
                <CopyButton value={shareUrl} iconOnly />
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function FlagshipHero({
  gallery,
  films,
  shareUrl,
  downloadsCopy,
  watchLabel,
}: {
  gallery: GalleryView;
  films: number;
  shareUrl: string;
  downloadsCopy: string;
  watchLabel: string;
}) {
  return (
    <section className="relative overflow-hidden bg-teal-950 text-cream">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute -left-32 top-10 h-[420px] w-[420px] rounded-full bg-turquoise/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-gold/10 blur-[110px]" />
      </div>
      <div className="relative mx-auto max-w-[1320px] px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1100px] rounded-sm border border-gold/35 bg-cream p-1.5 shadow-lift sm:p-2.5">
          {/* The official banner is shown whole — never cropped, at any width. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/banner.jpg"
            alt="65th Inaugural Lecture Series of NSUK — Intentional Intelligence: From Digital Trust to Human Flourishing"
            width={2400}
            height={800}
            className="block h-auto w-full"
            fetchPriority="high"
          />
        </div>
      </div>
      <div className="relative mx-auto max-w-[1100px] px-5 pb-14 pt-10 sm:px-8 sm:pb-16">
        <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-gold">
          {gallery.studio_name} · 65th Inaugural Lecture Series
        </p>
        <h1 className="mt-4 font-serif text-[44px] leading-[0.98] tracking-[-0.01em] sm:text-[64px] lg:text-[76px]">
          {gallery.title}
        </h1>
        {gallery.subtitle && (
          <p className="mt-4 max-w-2xl font-serif text-[19px] leading-snug text-cream/70 sm:text-[24px]">{gallery.subtitle}</p>
        )}
        {gallery.description && (
          <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-cream/50 sm:text-[14px]">{gallery.description}</p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <AccessBadgeLight mode={gallery.access_mode} />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cream/20 bg-cream/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-cream/65 backdrop-blur">
            <Download className="h-3 w-3 text-turquoise" /> {downloadsCopy}
          </span>
          <span className="hidden items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-cream/30 sm:inline-flex">
            <span className="h-1 w-1 rounded-full bg-cream/30" /> {gallery.studio_name}
          </span>
        </div>

        <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          {films > 0 ? (
            <a href="#films" className="btn-turquoise justify-center">
              <Play className="h-4 w-4 fill-current" /> {watchLabel}
            </a>
          ) : null}
          <a
            href="#gallery"
            className="btn justify-center border border-cream/25 px-6 py-3.5 text-cream hover:border-cream/55 hover:bg-cream/5"
          >
            Explore the gallery <ArrowDown className="h-4 w-4" />
          </a>
          {shareUrl && (
            <WhatsAppShare
              url={shareUrl}
              title={gallery.title}
              label="Share"
              className="justify-center border-cream/25 bg-transparent text-cream hover:bg-cream/5 hover:text-cream sm:ml-auto"
            />
          )}
        </div>
      </div>
    </section>
  );
}

function StandardHero({
  gallery,
  films,
  shareUrl,
  downloadsCopy,
  watchLabel,
}: {
  gallery: GalleryView;
  films: number;
  shareUrl: string;
  downloadsCopy: string;
  watchLabel: string;
}) {
  return (
    <section className="relative overflow-hidden bg-teal-950 text-cream">
      {gallery.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={gallery.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" fetchPriority="high" />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(48,213,180,0.25),transparent_55%)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-teal-950 via-teal-950/55 to-teal-950/25" />
      <div className="relative mx-auto flex min-h-[52vh] max-w-[1100px] flex-col justify-end px-5 pb-12 pt-24 sm:px-8 sm:pb-16 lg:min-h-[62vh] lg:pb-20">
        <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-gold">
          {gallery.studio_name}
          {gallery.published_at ? ` · ${formatDate(gallery.published_at)}` : ""}
        </p>
        <h1 className="mt-3 max-w-3xl font-serif text-[40px] leading-[1.02] tracking-[-0.01em] sm:text-[58px] lg:text-[68px]">
          {gallery.title}
        </h1>
        {gallery.subtitle && (
          <p className="mt-3 max-w-2xl font-serif text-[18px] leading-snug text-cream/70 sm:text-[22px]">{gallery.subtitle}</p>
        )}
        {gallery.description && (
          <p className="mt-4 max-w-2xl text-[12.5px] leading-relaxed text-cream/50 sm:text-[13.5px]">{gallery.description}</p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <AccessBadgeLight mode={gallery.access_mode} />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cream/20 bg-cream/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-cream/65 backdrop-blur">
            <Download className="h-3 w-3 text-turquoise" /> {downloadsCopy}
          </span>
        </div>

        <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          {films > 0 && (
            <a href="#films" className="btn-turquoise justify-center">
              <Play className="h-4 w-4 fill-current" /> {watchLabel}
            </a>
          )}
          <a
            href="#gallery"
            className="btn justify-center border border-cream/25 px-6 py-3.5 text-cream hover:border-cream/55 hover:bg-cream/5"
          >
            Explore the gallery <ArrowDown className="h-4 w-4" />
          </a>
          {shareUrl && (
            <WhatsAppShare
              url={shareUrl}
              title={gallery.title}
              label="Share"
              className="justify-center border-cream/25 bg-transparent text-cream hover:bg-cream/5 hover:text-cream sm:ml-auto"
            />
          )}
        </div>
      </div>
    </section>
  );
}

function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `nurax-view-${slug}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    void fetch(`/api/g/${slug}/view`, { method: "POST" }).catch(() => undefined);
  }, [slug]);
  return null;
}
