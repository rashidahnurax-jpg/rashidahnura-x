"use client";

import { useEffect } from "react";
import { Download, ExternalLink, Film, Info, X } from "lucide-react";
import {
  itemCanDownload,
  itemDisplaySize,
  itemInlineHref,
  prettySize,
  type GalleryItem,
  type GalleryView,
} from "./types";

export function FilmViewer({
  item,
  gallery,
  canDownload,
  chapterLabel,
  onClose,
  onDownload,
}: {
  item: GalleryItem;
  gallery: GalleryView;
  canDownload: boolean;
  chapterLabel: string;
  onClose: () => void;
  onDownload: (item: GalleryItem) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const downloadable = itemCanDownload(gallery, item, true);
  const size = itemDisplaySize(item);
  const thumb = item.poster_url ?? item.thumb_url;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#041a18]/98 text-cream backdrop-blur" role="dialog" aria-modal="true" aria-label={item.title}>
      <div className="flex items-center justify-between gap-3 border-b border-cream/10 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <Film className="h-4 w-4 shrink-0 text-gold" />
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-cream/50">
            {item.kind === "youtube" ? "YouTube film" : "Film"} {chapterLabel && <span className="text-cream/25">· {chapterLabel}</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/20 text-cream/70 transition hover:border-cream/45 hover:text-cream"
          aria-label="Close film"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-y-auto px-3 py-4 sm:px-10 sm:py-8">
        <div className="w-full max-w-5xl">
          <div className="overflow-hidden rounded-sm border border-cream/10 bg-black shadow-lift">
            <div className="relative aspect-video w-full">
              {item.kind === "youtube" && item.youtube_id ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${item.youtube_id}?autoplay=1&rel=0&modestbranding=1`}
                  title={item.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              ) : item.kind === "youtube" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-cream/40">
                  <Film className="h-7 w-7" />
                  <p className="text-[12px]">This film's link could not be read.</p>
                  {item.youtube_url && (
                    <a href={item.youtube_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-turquoise underline">
                      Open on YouTube
                    </a>
                  )}
                </div>
              ) : (
                <video
                  key={item.id}
                  src={itemInlineHref(gallery, item)}
                  poster={thumb ?? undefined}
                  controls
                  autoPlay
                  playsInline
                  className="absolute inset-0 h-full w-full bg-black"
                />
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="font-serif text-[24px] leading-tight text-cream sm:text-[28px]">{item.title}</h2>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] uppercase tracking-[0.12em] text-cream/35">
                {size > 0 && <span>Original {prettySize(size)}</span>}
                {item.kind === "youtube" && item.has_attachment && (
                  <span>
                    Attached: {item.attachment_name ?? "original file"}
                    {item.attachment_size ? ` · ${prettySize(item.attachment_size)}` : ""}
                  </span>
                )}
                <span>{item.kind === "youtube" ? "Played via YouTube's official player" : "Streamed from the studio's archive"}</span>
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
              {downloadable ? (
                <button type="button" onClick={() => onDownload(item)} className="btn-turquoise justify-center">
                  <Download className="h-4 w-4" />
                  {canDownload ? "Download original" : "Enter email to download"}{size > 0 ? ` · ${prettySize(size)}` : ""}
                </button>
              ) : item.kind === "youtube" && !item.has_attachment ? (
                <p className="flex max-w-[240px] items-start gap-2 rounded-sm border border-cream/10 bg-cream/[0.04] px-3 py-2 text-[10px] leading-relaxed text-cream/40">
                  <Info className="mt-0.5 h-3 w-3 shrink-0 text-gold" />
                  The studio has not attached a downloadable original for this film.
                </p>
              ) : (
                <p className="flex max-w-[240px] items-start gap-2 rounded-sm border border-cream/10 bg-cream/[0.04] px-3 py-2 text-[10px] leading-relaxed text-cream/40">
                  <Info className="mt-0.5 h-3 w-3 shrink-0 text-gold" />
                  Film downloads are switched off by the studio. Playback stays free.
                </p>
              )}
              {item.youtube_url && item.kind === "youtube" && (
                <a
                  href={item.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-sm border border-cream/15 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-cream/45 transition hover:border-cream/35 hover:text-cream/80"
                >
                  Open on YouTube <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
