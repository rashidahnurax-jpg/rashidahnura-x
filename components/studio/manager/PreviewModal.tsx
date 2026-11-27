"use client";

import { useState } from "react";
import { Download, Eye, Monitor, Smartphone, Film, Image as ImageIcon } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/format";
import { AccessBadgeLight } from "@/components/ui/Badges";
import type { ManagerChapter, ManagerGallery, ManagerItem } from "./ManagerTypes";
import { itemLarge, itemThumb } from "./ManagerTypes";

export function PreviewModal({
  open,
  onClose,
  gallery,
  chapters,
  items,
}: {
  open: boolean;
  onClose: () => void;
  gallery: ManagerGallery;
  chapters: ManagerChapter[];
  items: ManagerItem[];
}) {
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const ready = items.filter((item) => item.status === "ready");
  const cover =
    ready.find((item) => item.id === gallery.cover_item_id) ?? ready.find((item) => item.kind === "photo") ?? ready[0];
  const coverSrc = cover ? itemLarge(gallery.slug, cover) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Preview the customer experience"
      eyebrow="Live studio preview"
      className="sm:max-w-5xl"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[11px] text-ink/45">
          Owner preview. Download prompts and access gates are bypassed; the published gallery respects them.
        </p>
        <div className="flex shrink-0 rounded-full border border-teal-900/15 bg-white p-1">
          <button
            type="button"
            onClick={() => setDevice("mobile")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition",
              device === "mobile" ? "bg-teal-950 text-cream" : "text-teal-900/50",
            )}
          >
            <Smartphone className="h-3.5 w-3.5" /> Mobile
          </button>
          <button
            type="button"
            onClick={() => setDevice("desktop")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition",
              device === "desktop" ? "bg-teal-950 text-cream" : "text-teal-900/50",
            )}
          >
            <Monitor className="h-3.5 w-3.5" /> Desktop
          </button>
        </div>
      </div>

      <div className={cn("mx-auto transition-all", device === "mobile" ? "max-w-[390px]" : "max-w-full")}>
        <div className="overflow-hidden rounded-[26px] border border-teal-900/20 bg-cream-soft shadow-lift">
          <div className="flex items-center justify-between border-b border-teal-900/10 bg-cream-soft px-4 py-2.5">
            <img src="/brand/nurax-logo-320.png" alt="NURA-X" className="h-6 w-6 rounded-full object-contain" />
            <span className="text-[8px] uppercase tracking-[0.22em] text-teal-900/40">NURA-X Studio</span>
            <span className="flex items-center gap-1 text-[8px] uppercase tracking-[0.14em] text-teal-900/40">
              <Download className="h-2.5 w-2.5" /> Free
            </span>
          </div>

          <div className="max-h-[62dvh] overflow-y-auto">
            <div className="relative bg-teal-950">
              {coverSrc ? (
                <img src={coverSrc} alt="" className={cn("w-full object-cover", device === "mobile" ? "aspect-[3/4]" : "aspect-[21/9]")} />
              ) : (
                <div className="flex aspect-[16/9] items-center justify-center text-cream/50">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-teal-950 via-teal-950/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <AccessBadgeLight mode={gallery.access_mode} />
                <h3 className="mt-2 font-serif text-2xl leading-tight text-cream">{gallery.title}</h3>
                {gallery.subtitle && <p className="mt-1 font-serif text-[12px] italic text-cream/65">{gallery.subtitle}</p>}
              </div>
            </div>

            {gallery.description && (
              <p className="px-4 pt-4 text-[11.5px] leading-relaxed text-ink/55">{gallery.description}</p>
            )}

            <div className="space-y-5 p-4">
              {chapters.map((chapter) => {
                const chapterItems = ready.filter((item) => item.chapter_id === chapter.id);
                if (chapterItems.length === 0) return null;
                return (
                  <section key={chapter.id}>
                    <div className="flex items-center justify-between border-b border-teal-900/10 pb-2">
                      <h4 className="font-serif text-[15px] text-teal-950">{chapter.title}</h4>
                      <span className="text-[8px] uppercase tracking-[0.16em] text-teal-900/35">{chapterItems.length} frames</span>
                    </div>
                    <div className={cn("mt-2.5 grid gap-1.5", device === "mobile" ? "grid-cols-2" : "grid-cols-4")}>
                      {chapterItems.map((item) => {
                        const src = itemThumb(gallery.slug, item);
                        return (
                          <div key={item.id} className="group/tile relative aspect-[4/5] overflow-hidden rounded-[3px] bg-teal-900">
                            {src ? (
                              <img src={src} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-cream/30">
                                {item.kind === "photo" ? <ImageIcon className="h-5 w-5" /> : <Film className="h-5 w-5" />}
                              </div>
                            )}
                            {item.kind !== "photo" && (
                              <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-teal-950/70 text-cream">
                                <Film className="h-2.5 w-2.5" />
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
              {ready.length === 0 && (
                <p className="rounded-sm border border-dashed border-teal-900/20 p-6 text-center text-[11px] text-ink/40">
                  Add media to see the gallery come alive.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-teal-900/10 bg-cream-soft px-4 py-2.5">
            <span className="text-[8px] uppercase tracking-[0.18em] text-teal-900/35">{ready.length} files</span>
            <span className="flex items-center gap-2 text-[8px] uppercase tracking-[0.18em] text-teal-900/35">
              <Eye className="h-2.5 w-2.5" /> Preview only
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
