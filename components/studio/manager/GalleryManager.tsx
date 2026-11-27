"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Images,
  Loader2,
  Palette,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { AccessBadge, StatusBadge } from "@/components/ui/Badges";
import { cn, isExpired } from "@/lib/format";
import type { ManagerData, ManagerGallery } from "./ManagerTypes";
import { apiError } from "./ManagerTypes";
import { DesignPanel } from "./DesignPanel";
import { MediaPanel } from "./MediaPanel";
import { AccessPanel } from "./AccessPanel";
import { SharePanel } from "./SharePanel";
import { PreviewModal } from "./PreviewModal";

type Tab = "design" | "media" | "access" | "share";

const TABS: { id: Tab; label: string; icon: typeof Palette }[] = [
  { id: "design", label: "Design", icon: Palette },
  { id: "media", label: "Media", icon: Images },
  { id: "access", label: "Access", icon: ShieldCheck },
  { id: "share", label: "Share", icon: Send },
];

export function GalleryManager({ initial, origin }: { initial: ManagerData; origin: string }) {
  const [gallery, setGallery] = useState<ManagerGallery>(initial.gallery);
  const [chapters, setChapters] = useState(initial.chapters);
  const [items, setItems] = useState(initial.items);
  const [emails, setEmails] = useState(initial.emails);
  const [quota, setQuota] = useState(initial.quota);
  const [tab, setTab] = useState<Tab>("design");
  const [notice, setNoticeState] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const noticeTimer = useRef<number | null>(null);

  function setNotice(text: string, tone: "success" | "error" = "success") {
    setNoticeState({ text, tone });
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNoticeState(null), 6500);
  }

  async function reload() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/studio/galleries/${gallery.id}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as ManagerData;
      setGallery(data.gallery);
      setChapters(data.chapters);
      setItems(data.items);
      setEmails(data.emails);
      setQuota(data.quota);
    } catch {
      // keep the last good state
    } finally {
      setRefreshing(false);
    }
  }

  async function patchGallery(payload: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch(`/api/studio/galleries/${gallery.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: apiError(data, "Could not save those changes.") };
    await reload();
    return { ok: true };
  }

  const live = gallery.status === "published" && !gallery.revoked_at && !isExpired(gallery.expires_at);

  return (
    <div>
      <div className="border-b border-teal-900/10 bg-cream-soft/70">
        <div className="mx-auto w-full max-w-[1180px] px-5 pb-5 pt-5 md:px-8 md:pt-7 lg:px-10 xl:px-12">
          <Link href="/studio" className="inline-flex items-center gap-2 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-teal-900/45 transition hover:text-teal-950">
            <ArrowLeft className="h-3 w-3" /> All galleries
          </Link>

          <div className="mt-4 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge gallery={gallery} />
                <AccessBadge mode={gallery.access_mode} />
                {gallery.featured === 1 && (
                  <span className="chip border-gold/40 bg-gold/10 text-gold-deep">Featured</span>
                )}
                {refreshing && <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-900/30" />}
              </div>
              <h1 className="mt-3 font-serif text-[34px] leading-[1.03] text-teal-950 md:text-[46px]">{gallery.title}</h1>
              {gallery.subtitle && <p className="mt-1.5 font-serif text-[16px] italic text-ink/45 md:text-[18px]">{gallery.subtitle}</p>}
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.14em] text-teal-900/35">
                <span>{items.filter((item) => item.status === "ready").length} ready</span>
                <span>·</span>
                <span>{chapters.length} chapters</span>
                <span>·</span>
                <span>{gallery.view_count} views</span>
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <button type="button" onClick={() => setPreviewOpen(true)} className="btn-outline px-4 py-2.5 text-[10px]">
                Preview customer view
              </button>
              {live && (
                <a
                  href={`/g/${gallery.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost px-3 py-2.5 text-[10px]"
                >
                  Open live <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-[57px] z-20 border-b border-teal-900/10 bg-cream-soft/95 backdrop-blur lg:top-0">
        <div className="no-scrollbar mx-auto flex w-full max-w-[1180px] gap-1 overflow-x-auto px-3 md:px-6 lg:px-8 xl:px-10">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            const count = id === "media" ? items.length : undefined;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "relative flex shrink-0 items-center gap-2 px-4 py-3.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] transition",
                  active ? "text-teal-950" : "text-teal-900/40 hover:text-teal-900/70",
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                {label}
                {count !== undefined && count > 0 && (
                  <span className="rounded-full bg-teal-900/8 px-1.5 py-0.5 text-[8.5px] tabular-nums text-teal-900/50">{count}</span>
                )}
                {active && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-gold" />}
              </button>
            );
          })}
          <div className="ml-auto hidden items-center pr-2 sm:flex">
            <span className="text-[9px] uppercase tracking-[0.16em] text-teal-900/25">
              {Math.round((quota.used / Math.max(quota.limit, 1)) * 100)}% storage
            </span>
          </div>
        </div>
      </div>

      {notice && (
        <div className="mx-auto w-full max-w-[1180px] px-5 pt-4 md:px-8 lg:px-10 xl:px-12">
          <div
            className={cn(
              "flex items-start justify-between gap-3 rounded-sm border px-4 py-3 text-[11.5px]",
              notice.tone === "error"
                ? "border-red-900/15 bg-red-50 text-red-800"
                : "border-turquoise-deep/25 bg-turquoise/10 text-teal-900",
            )}
          >
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNoticeState(null)} aria-label="Dismiss" className="shrink-0 opacity-50 hover:opacity-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-[1180px] px-5 py-6 md:px-8 md:py-8 lg:px-10 xl:px-12">
        {tab === "design" && (
          <DesignPanel
            gallery={gallery}
            chapters={chapters}
            items={items}
            patchGallery={patchGallery}
            reload={reload}
            setNotice={setNotice}
            onPreview={() => setPreviewOpen(true)}
          />
        )}
        {tab === "media" && (
          <MediaPanel
            gallery={gallery}
            chapters={chapters}
            items={items}
            patchGallery={patchGallery}
            reload={reload}
            setNotice={setNotice}
          />
        )}
        {tab === "access" && (
          <AccessPanel gallery={gallery} emails={emails} patchGallery={patchGallery} reload={reload} setNotice={setNotice} />
        )}
        {tab === "share" && (
          <SharePanel
            gallery={gallery}
            origin={origin}
            itemsCount={items.length}
            readyCount={items.filter((item) => item.status === "ready").length}
            emailsCount={emails.length}
            reload={reload}
            setNotice={setNotice}
            onPreview={() => setPreviewOpen(true)}
          />
        )}
      </div>

      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        gallery={gallery}
        chapters={chapters}
        items={items}
      />
    </div>
  );
}
