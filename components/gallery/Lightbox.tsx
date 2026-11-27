"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Download, Heart, X } from "lucide-react";
import { cn } from "@/lib/format";
import {
  itemCanDownload,
  itemDisplaySize,
  itemLargeSrc,
  prettySize,
  type GalleryItem,
  type GalleryView,
} from "./types";

export function Lightbox({
  items,
  index,
  gallery,
  chapterName,
  canDownload,
  selected,
  onToggleSelect,
  onClose,
  onIndex,
  onDownload,
}: {
  items: GalleryItem[];
  index: number;
  gallery: GalleryView;
  chapterName: (chapterId: string | null) => string;
  canDownload: boolean;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onClose: () => void;
  onIndex: (next: number) => void;
  onDownload: (item: GalleryItem) => void;
}) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const item = items[index];

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onIndex((index + 1) % items.length);
      else if (e.key === "ArrowLeft") onIndex((index - 1 + items.length) % items.length);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [index, item, items.length, onClose, onIndex]);

  useEffect(() => {
    if (items.length < 2) return;
    [items[(index + 1) % items.length], items[(index - 1 + items.length) % items.length]].forEach((neighbour) => {
      const src = neighbour ? itemLargeSrc(neighbour) : null;
      if (src) {
        const image = new window.Image();
        image.src = src;
      }
    });
  }, [index, items]);

  if (!item) return null;
  const src = itemLargeSrc(item);
  const favourite = selected.has(item.id);
  const downloadable = itemCanDownload(gallery, item, true);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-[#041a18] text-cream"
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        touchStart.current = { x: touch.clientX, y: touch.clientY };
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        if (!start) return;
        const touch = e.changedTouches[0];
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        touchStart.current = null;
        if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
        onIndex(dx < 0 ? (index + 1) % items.length : (index - 1 + items.length) % items.length);
      }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="font-mono text-[10px] tracking-[0.18em] text-cream/45">
            {String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
          </span>
          <span className="hidden h-3 w-px bg-cream/15 sm:block" />
          <span className="hidden truncate text-[9.5px] uppercase tracking-[0.16em] text-cream/40 sm:block">
            {chapterName(item.chapter_id)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggleSelect(item.id)}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[9px] font-semibold uppercase tracking-[0.12em] transition",
              favourite
                ? "border-turquoise bg-turquoise text-teal-950"
                : "border-cream/20 text-cream/70 hover:border-cream/45 hover:text-cream",
            )}
            aria-pressed={favourite}
          >
            <Heart className={cn("h-3.5 w-3.5", favourite && "fill-current")} />
            <span className="hidden sm:inline">{favourite ? "In selection" : "Add to selection"}</span>
          </button>
          {downloadable && (
            <button
              type="button"
              onClick={() => onDownload(item)}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-cream/20 px-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-cream/70 transition hover:border-cream/45 hover:text-cream"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{canDownload ? "Download" : "Enter email to download"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/20 text-cream/70 transition hover:border-cream/45 hover:text-cream"
            aria-label="Close viewer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={item.id}
            src={src}
            alt={item.title}
            className="max-h-full max-w-full select-none object-contain animate-fadeUp"
            draggable={false}
          />
        ) : (
          <p className="text-[12px] text-cream/40">This photograph is still being prepared.</p>
        )}

        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => onIndex((index - 1 + items.length) % items.length)}
              className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cream/15 bg-teal-950/60 text-cream/70 backdrop-blur transition hover:border-cream/40 hover:text-cream sm:left-5"
              aria-label="Previous photograph"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => onIndex((index + 1) % items.length)}
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cream/15 bg-teal-950/60 text-cream/70 backdrop-blur transition hover:border-cream/40 hover:text-cream sm:right-5"
              aria-label="Next photograph"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      <div className="flex items-end justify-between gap-4 px-4 pb-5 pt-3 sm:px-6">
        <div className="min-w-0">
          <p className="truncate font-serif text-[17px] leading-tight text-cream">{item.title}</p>
          <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-cream/35">
            {item.width && item.height ? `${item.width} × ${item.height}` : "Photograph"} · {prettySize(itemDisplaySize(item))} original
          </p>
        </div>
        <p className="hidden shrink-0 text-[8.5px] uppercase tracking-[0.16em] text-cream/25 sm:block">
          Swipe or use arrow keys
        </p>
      </div>
    </div>
  );
}
