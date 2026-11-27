import { notFound } from "next/navigation";
import Link from "next/link";
import { Ban, CalendarX, EyeOff, ShieldAlert } from "lucide-react";
import { evaluateAccess, getGalleryBySlug, parseMeta } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { getChapters, getMediaItems, publicItemsFor, resolveCoverId, studioName } from "@/lib/data";
import { GalleryPage } from "@/components/gallery/GalleryPage";
import { AccessGate } from "@/components/gallery/AccessGate";
import { Logo } from "@/components/brand/Logo";
import { formatDate } from "@/lib/format";
import type { AccessReason } from "@/lib/access";
import type { GalleryRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gallery = await getGalleryBySlug(slug);
  if (!gallery) return { title: "Gallery not found — NURA-X STUDIO" };
  const open = gallery.status === "published" && !gallery.revoked_at;
  if (!open) return { title: "Private gallery — NURA-X STUDIO" };
  return {
    title: `${gallery.title} — NURA-X STUDIO`,
    description: gallery.subtitle ?? gallery.description ?? "A gallery shared through NURA-X STUDIO.",
  };
}

export default async function PublicGalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gallery = await getGalleryBySlug(slug);
  if (!gallery) notFound();

  const viewer = await getCurrentUser();
  const access = await evaluateAccess(gallery, { viewer, preview: true });
  const studio = studioName(gallery.studio_id);
  const cover = resolveCoverId(gallery) ? `/api/public/cover/${gallery.slug}` : null;

  if (!access.browsable) {
    if (access.reason === "locked" && (gallery.access_mode === "password" || gallery.access_mode === "invite")) {
      return (
        <AccessGate
          gallery={{
            slug: gallery.slug,
            title: gallery.title,
            subtitle: gallery.subtitle,
            cover_url: cover,
            studio_name: studio,
            access_mode: gallery.access_mode,
          }}
        />
      );
    }
    return <ClosedGallery gallery={gallery} reason={access.reason} studio={studio} />;
  }

  const chapters = getChapters(gallery.id).map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    position: chapter.position,
  }));
  const items = getMediaItems(gallery.id).map((item) => ({
    ...publicItemsFor(gallery, [item])[0],
    chapter_id: item.chapter_id,
    created_at: item.created_at,
  }));

  return (
    <GalleryPage
      gallery={{
        id: gallery.id,
        slug: gallery.slug,
        title: gallery.title,
        subtitle: gallery.subtitle,
        description: gallery.description,
        kind: gallery.kind,
        access_mode: gallery.access_mode,
        allow_photo_downloads: Boolean(gallery.allow_photo_downloads),
        allow_video_downloads: Boolean(gallery.allow_video_downloads),
        expires_at: gallery.expires_at,
        published_at: gallery.published_at,
        studio_name: studio,
        cover_url: cover,
        canDownload: access.canDownload,
        email: access.email,
        isOwnerPreview: access.isOwnerPreview,
      }}
      chapters={chapters}
      items={items}
      meta={parseMeta(gallery)}
    />
  );
}

function ClosedGallery({ gallery, reason, studio }: { gallery: GalleryRow; reason: AccessReason; studio: string }) {
  const content =
    reason === "revoked"
      ? {
          icon: Ban,
          eyebrow: "Link revoked",
          title: "This link has been withdrawn.",
          body: "The studio has closed this gallery's link. If you believe you should still have access, ask the studio to share it again.",
          tone: "text-red-800 border-red-900/20 bg-red-800/[0.06]",
        }
      : reason === "expired"
        ? {
            icon: CalendarX,
            eyebrow: "Link expired",
            title: "This gallery link has expired.",
            body: `The studio set this gallery to close on ${formatDate(gallery.expires_at)}. Ask them for a fresh link if you need to return.`,
            tone: "text-amber-900 border-amber-700/25 bg-amber-600/[0.08]",
          }
        : reason === "unpublished"
          ? {
              icon: EyeOff,
              eyebrow: "Not published",
              title: "This gallery isn't live yet.",
              body: "The studio is still preparing it. The same link will open once the gallery is published.",
              tone: "text-teal-900 border-teal-900/15 bg-teal-900/[0.05]",
            }
          : {
              icon: ShieldAlert,
              eyebrow: "Unavailable",
              title: "This gallery is not available.",
              body: "The studio's link is currently closed. Check back later or contact the studio that shared it.",
              tone: "text-teal-900 border-teal-900/15 bg-teal-900/[0.05]",
            };
  const Icon = content.icon;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-teal-950 text-cream">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-turquoise/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-gold/10 blur-[110px]" />
      </div>
      <header className="relative z-10 mx-auto flex w-full max-w-[1100px] items-center justify-between px-5 py-5 sm:px-8">
        <Logo light compact />
        <span className="text-[8.5px] font-semibold uppercase tracking-[0.2em] text-cream/35">Private link</span>
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-5 pb-20 pt-6 sm:px-8">
        <div className="w-full max-w-lg rounded-sm border border-cream/10 bg-cream-soft p-7 text-ink shadow-lift sm:p-10">
          <span className={`inline-flex h-11 w-11 items-center justify-center rounded-full border ${content.tone}`}>
            <Icon className="h-4 w-4" />
          </span>
          <p className="mt-5 text-[9px] font-semibold uppercase tracking-[0.26em] text-gold-deep">{content.eyebrow}</p>
          <h1 className="mt-2 font-serif text-[28px] leading-[1.06] text-teal-950 sm:text-[34px]">{content.title}</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-ink/55">{content.body}</p>
          <p className="mt-4 truncate text-[10px] uppercase tracking-[0.14em] text-teal-900/35">
            {gallery.title} · shared by {studio}
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <Link href="/" className="btn-primary">Visit NURA-X STUDIO</Link>
            <Link href="/galleries" className="btn-outline">Public archive</Link>
          </div>
        </div>
      </main>
      <footer className="relative z-10 pb-8 text-center text-[9px] uppercase tracking-[0.2em] text-cream/25">
        One considered link · NURA-X STUDIO
      </footer>
    </div>
  );
}
