"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Eraser,
  Eye,
  Loader2,
  RotateCcw,
  Search,
  Star,
  Ban,
  ImageOff,
} from "lucide-react";
import { CopyButton } from "@/components/ui/CopyButton";
import { Modal } from "@/components/ui/Modal";
import { AccessBadge, StatusBadge } from "@/components/ui/Badges";
import { cn, formatDate, isExpired, timeAgo } from "@/lib/format";
import { apiError } from "@/components/studio/manager/ManagerTypes";
import type { GalleryCard } from "@/lib/types";

type AdminGallery = GalleryCard & { studio_email: string; studio_status: string };
type Filter = "all" | "live" | "draft" | "revoked";

export function GalleriesTable({ rows, origin }: { rows: AdminGallery[]; origin: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ gallery: AdminGallery; action: "unpublish" | "revoke" | "restore" } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((g) => {
      if (filter === "live" && !(g.status === "published" && !g.revoked_at && !isExpired(g.expires_at))) return false;
      if (filter === "draft" && (g.status !== "draft" || g.revoked_at)) return false;
      if (filter === "revoked" && !g.revoked_at) return false;
      if (!q) return true;
      return (
        g.title.toLowerCase().includes(q) ||
        g.slug.toLowerCase().includes(q) ||
        g.studio_name.toLowerCase().includes(q) ||
        g.studio_email.toLowerCase().includes(q)
      );
    });
  }, [rows, query, filter]);

  async function patch(gallery: AdminGallery, payload: Record<string, unknown>) {
    setBusyId(gallery.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/galleries/${gallery.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(apiError(data, "Could not update this gallery."));
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Network error. Try again.");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function toggleFeatured(gallery: AdminGallery) {
    await patch(gallery, { featured: !gallery.featured });
  }

  async function runConfirm() {
    if (!confirm) return;
    const { gallery, action } = confirm;
    if (await patch(gallery, { [action]: true })) setConfirm(null);
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "All"],
              ["live", "Live"],
              ["draft", "Drafts"],
              ["revoked", "Revoked"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition",
                filter === id
                  ? "border-teal-900 bg-teal-900 text-cream"
                  : "border-teal-900/15 bg-white text-teal-900/60 hover:border-teal-900/30",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="relative block sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-900/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, studio or email"
            className="field w-full pl-9 text-[12px]"
            aria-label="Search galleries"
          />
        </label>
      </div>

      {error && <p className="mt-3 rounded-sm border border-red-900/15 bg-red-50 px-3 py-2 text-[11px] text-red-800">{error}</p>}

      <div className="mt-4 space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-sm border border-dashed border-teal-900/15 bg-white py-16 text-center text-[12px] text-ink/40">
            No galleries match this view.
          </div>
        )}
        {filtered.map((gallery) => {
          const published = gallery.status === "published" && !gallery.revoked_at;
          const expired = published && isExpired(gallery.expires_at);
          const live = published && !expired;
          const flagship = gallery.kind === "flagship";
          return (
            <article key={gallery.id} className="rounded-sm border border-teal-900/10 bg-white p-4">
              <div className="flex gap-3.5">
                <div className="relative hidden h-20 w-16 shrink-0 overflow-hidden rounded-sm bg-teal-900/5 sm:block">
                  {gallery.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={gallery.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-teal-900/20">
                      <ImageOff className="h-5 w-5" />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {live ? (
                          <Link href={`/g/${gallery.slug}`} className="truncate font-serif text-[18px] leading-tight text-teal-950 hover:text-turquoise-deep">
                            {gallery.title}
                          </Link>
                        ) : (
                          <span className="truncate font-serif text-[18px] leading-tight text-teal-950">{gallery.title}</span>
                        )}
                        {flagship && (
                          <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-gold-deep">
                            Flagship
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[10.5px] text-ink/45">
                        {gallery.studio_name} · {gallery.studio_email} · /{gallery.slug}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge gallery={gallery} />
                      <AccessBadge mode={gallery.access_mode} />
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-ink/40">
                    <span>{gallery.photo_count} photos · {gallery.video_count} films</span>
                    <span>{gallery.view_count} views</span>
                    <span>Updated {timeAgo(gallery.updated_at)}</span>
                    {gallery.expires_at && <span>· Expires {formatDate(gallery.expires_at)}</span>}
                    {expired && <span className="font-semibold text-amber-800">Expired link</span>}
                    {gallery.revoked_at && <span className="font-semibold text-red-800">Revoked {formatDate(gallery.revoked_at)}</span>}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleFeatured(gallery)}
                      disabled={busyId !== null}
                      aria-pressed={Boolean(gallery.featured)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] transition",
                        gallery.featured
                          ? "border-gold/50 bg-gold/15 text-gold-deep"
                          : "border-teal-900/15 text-teal-900/50 hover:border-gold/40 hover:text-gold-deep",
                      )}
                    >
                      <Star className={cn("h-3 w-3", gallery.featured ? "fill-current" : "")} />
                      {gallery.featured ? "Featured" : "Feature"}
                    </button>

                    {live && (
                      <>
                        <Link
                          href={`/g/${gallery.slug}`}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 rounded-sm border border-teal-900/15 px-2.5 py-1.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-teal-900/60 transition hover:border-teal-900/30 hover:text-teal-900"
                        >
                          <Eye className="h-3 w-3" /> Open <ArrowUpRight className="h-2.5 w-2.5" />
                        </Link>
                        <CopyButton value={`${origin}/g/${gallery.slug}`} iconOnly className="h-7 px-2" />
                      </>
                    )}

                    {published && !flagship && (
                      <button
                        type="button"
                        onClick={() => { setError(null); setConfirm({ gallery, action: "unpublish" }); }}
                        disabled={busyId !== null}
                        className="inline-flex items-center gap-1.5 rounded-sm border border-teal-900/15 px-2.5 py-1.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-teal-900/60 transition hover:border-teal-900/30 hover:text-teal-900"
                      >
                        <Eraser className="h-3 w-3" /> Unpublish
                      </button>
                    )}

                    {!gallery.revoked_at && (
                      <button
                        type="button"
                        onClick={() => { setError(null); setConfirm({ gallery, action: "revoke" }); }}
                        disabled={busyId !== null}
                        className="inline-flex items-center gap-1.5 rounded-sm border border-red-900/20 px-2.5 py-1.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-red-800 transition hover:bg-red-50"
                      >
                        <Ban className="h-3 w-3" /> Revoke link
                      </button>
                    )}

                    {gallery.revoked_at && (
                      <button
                        type="button"
                        onClick={() => { setError(null); setConfirm({ gallery, action: "restore" }); }}
                        disabled={busyId !== null}
                        className="inline-flex items-center gap-1.5 rounded-sm border border-turquoise-deep/30 bg-turquoise/10 px-2.5 py-1.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-teal-900 transition hover:bg-turquoise/20"
                      >
                        <RotateCcw className="h-3 w-3" /> Restore link
                      </button>
                    )}

                    {busyId === gallery.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-900/40" />}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <ConfirmModal
        confirm={confirm}
        busy={Boolean(confirm && busyId === confirm.gallery.id)}
        error={error}
        onClose={() => { setConfirm(null); setError(null); }}
        onConfirm={runConfirm}
      />
    </div>
  );
}

function ConfirmModal({
  confirm,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  confirm: { gallery: AdminGallery; action: "unpublish" | "revoke" | "restore" } | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const copy = confirm
    ? {
        unpublish: {
          eyebrow: "Unpublish",
          title: `Take "${confirm.gallery.title}" offline?`,
          body: "Guests can no longer access the gallery. The studio can publish it again at the same address; access restrictions and expiry still apply.",
          cta: "Unpublish gallery",
        },
        revoke: {
          eyebrow: "Revoke link",
          title: `Revoke access to "${confirm.gallery.title}"?`,
          body: "Guests cannot access the gallery through its link while revoked. Existing access sessions are invalidated. An admin can restore access at the same address; publication status is unchanged. Previously downloaded copies are not affected.",
          cta: "Revoke link",
        },
        restore: {
          eyebrow: "Restore link",
          title: `Restore "${confirm.gallery.title}"?`,
          body: "This clears the revocation without changing the gallery's publication status. Published galleries are accessible again at the same address unless expired; drafts and unpublished galleries remain offline. Existing expiry dates and access restrictions still apply.",
          cta: "Restore gallery",
        },
      }[confirm.action]
    : null;

  return (
    <Modal open={Boolean(confirm) && Boolean(copy)} onClose={onClose} eyebrow={copy?.eyebrow} title={copy?.title}>
      <p className="text-[13px] leading-relaxed text-ink/60">{copy?.body}</p>
      {error && <p role="alert" className="mt-3 text-[12px] text-red-800">{error}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={cn(
            "inline-flex items-center gap-2 rounded-sm px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition disabled:opacity-60",
            confirm?.action === "revoke" ? "bg-red-800 hover:bg-red-900" : "bg-teal-900 hover:bg-teal-950",
          )}
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {copy?.cta}
        </button>
      </div>
    </Modal>
  );
}
