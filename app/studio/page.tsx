import Link from "next/link";
import { headers } from "next/headers";
import {
  ArrowRight,
  ArrowUpRight,
  Eye,
  FolderOpen,
  Globe2,
  HardDrive,
  Image as ImageIcon,
  Plus,
  Sparkles,
} from "lucide-react";
import { requireStudio } from "@/lib/auth";
import { studioGalleries } from "@/lib/data";
import { quotaFor } from "@/lib/uploads";
import { formatBytes, formatDate, isExpired } from "@/lib/format";
import { CreateGalleryButton } from "@/components/studio/CreateGalleryButton";
import { CopyButton, WhatsAppShare } from "@/components/ui/CopyButton";
import { AccessBadge, StatusBadge } from "@/components/ui/Badges";

export const dynamic = "force-dynamic";

export default async function StudioOverview() {
  const user = await requireStudio();
  const galleries = studioGalleries(user.id);
  const quota = quotaFor(user);

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  const live = galleries.filter((g) => g.status === "published" && !g.revoked_at && !isExpired(g.expires_at));
  const drafts = galleries.filter((g) => g.status === "draft");
  const photos = galleries.reduce((sum, g) => sum + g.photo_count, 0);
  const films = galleries.reduce((sum, g) => sum + g.video_count, 0);
  const views = galleries.reduce((sum, g) => sum + g.view_count, 0);

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-8 md:px-8 md:py-10 lg:px-10 xl:px-12">
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="label text-gold-deep">Studio workspace</p>
          <h1 className="mt-3 font-serif text-4xl leading-[1.02] text-teal-950 md:text-[52px]">
            Your galleries, <em className="italic">held with intention.</em>
          </h1>
          <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-ink/55">
            Every gallery begins as a private draft. Build it, preview it, and publish to one link when the story is ready.
          </p>
        </div>
        <div id="new" className="shrink-0">
          <CreateGalleryButton />
        </div>
      </div>

      <div className="mt-9 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: FolderOpen, label: "Galleries", value: String(galleries.length), note: `${drafts.length} draft${drafts.length === 1 ? "" : "s"}` },
          { icon: Globe2, label: "Live links", value: String(live.length), note: "Published & open" },
          { icon: ImageIcon, label: "Media held", value: String(photos + films), note: `${photos} photos · ${films} films` },
          { icon: HardDrive, label: "Storage used", value: formatBytes(quota.used), note: `of ${formatBytes(quota.limit)}` },
        ].map(({ icon: Icon, label, value, note }) => (
          <div key={label} className="rounded-sm border border-teal-900/10 bg-white p-4 md:p-5">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-teal-900/40">{label}</p>
              <Icon className="h-4 w-4 text-gold-deep" strokeWidth={1.6} />
            </div>
            <p className="mt-3 font-serif text-[28px] leading-none text-teal-950 md:text-[32px]">{value}</p>
            <p className="mt-2 text-[10.5px] text-ink/40">{note}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-sm border border-teal-900/10 bg-cream px-4 py-3">
        <p className="flex items-center gap-2 text-[11px] text-teal-900/55">
          <Eye className="h-3.5 w-3.5 text-gold-deep" />
          {views === 0 ? "No gallery views yet." : `${views} view${views === 1 ? "" : "s"} across your galleries.`}
        </p>
        <p className="flex items-center gap-2 text-[11px] text-teal-900/55">
          <Sparkles className="h-3.5 w-3.5 text-gold-deep" />
          Featured galleries are curated with the NURA-X admin.
        </p>
      </div>

      <div className="mt-10 flex items-end justify-between">
        <h2 className="font-serif text-2xl text-teal-950 md:text-[30px]">All galleries</h2>
        <p className="text-[10px] uppercase tracking-[0.18em] text-teal-900/35">{galleries.length} total</p>
      </div>

      {galleries.length === 0 ? (
        <div className="mt-4 rounded-sm border border-dashed border-teal-900/20 bg-white/60 px-6 py-16 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-cream">
            <Plus className="h-6 w-6 text-gold-deep" strokeWidth={1.5} />
          </span>
          <h3 className="mt-5 font-serif text-2xl text-teal-950">Your first gallery starts here.</h3>
          <p className="mx-auto mt-2 max-w-sm text-[12.5px] leading-relaxed text-ink/55">
            Name it, add chapters and upload the originals. It stays private until you press publish.
          </p>
          <div className="mx-auto mt-6 w-fit">
            <CreateGalleryButton />
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {galleries.map((gallery) => {
            const liveNow = gallery.status === "published" && !gallery.revoked_at && !isExpired(gallery.expires_at);
            return (
              <article key={gallery.id} className="group flex flex-col overflow-hidden rounded-sm border border-teal-900/10 bg-white transition hover:border-gold/40 hover:shadow-lift">
                <Link href={`/studio/g/${gallery.id}`} className="relative block overflow-hidden bg-teal-950">
                  {gallery.cover_url ? (
                    <img
                      src={gallery.cover_url}
                      alt=""
                      className="aspect-[16/10] w-full object-cover transition duration-700 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex aspect-[16/10] items-center justify-center">
                      <span className="px-5 text-center font-serif text-xl text-cream/70">{gallery.title}</span>
                    </div>
                  )}
                  <div className="absolute inset-x-3 top-3 flex flex-wrap gap-1.5">
                    <StatusBadge gallery={gallery} className="bg-cream-soft/95 shadow-sm backdrop-blur" />
                    {gallery.featured === 1 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-gold/50 bg-cream/95 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-gold-deep shadow-sm">
                        <Sparkles className="h-3 w-3" /> Featured
                      </span>
                    )}
                  </div>
                </Link>

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center justify-between gap-2">
                    <AccessBadge mode={gallery.access_mode} />
                    <span className="text-[10px] text-ink/35">
                      {gallery.photo_count} photos{gallery.video_count ? ` · ${gallery.video_count} films` : ""}
                    </span>
                  </div>
                  <Link href={`/studio/g/${gallery.id}`}>
                    <h3 className="mt-3 font-serif text-[24px] leading-tight text-teal-950 transition group-hover:text-teal-900">{gallery.title}</h3>
                  </Link>
                  {gallery.subtitle && <p className="mt-1 line-clamp-1 font-serif text-[13px] italic text-ink/45">{gallery.subtitle}</p>}
                  <p className="mt-3 text-[10.5px] text-ink/35">
                    Updated {formatDate(gallery.updated_at)}
                    {liveNow && gallery.published_at ? ` · Live since ${formatDate(gallery.published_at)}` : ""}
                  </p>

                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-teal-900/10 pt-4">
                    <Link href={`/studio/g/${gallery.id}`} className="btn-outline flex-1 justify-center px-3 py-2 text-[10px]">
                      Manage
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                    {liveNow ? (
                      <>
                        <CopyButton value={`${origin}/g/${gallery.slug}`} iconOnly />
                        <a
                          href={`/g/${gallery.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-ghost h-9 px-2.5"
                          aria-label="Open the public gallery"
                          title="Open public gallery"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      </>
                    ) : (
                      <span className="rounded-full border border-teal-900/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] text-teal-900/35">
                        {gallery.status === "draft" ? "Private" : "Not live"}
                      </span>
                    )}
                  </div>
                  {liveNow && (
                    <div className="mt-2">
                      <WhatsAppShare url={`${origin}/g/${gallery.slug}`} title={gallery.title} className="w-full justify-center px-3 py-2 text-[10px]" />
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="mt-10 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-teal-900/30">
        <ArrowUpRight className="h-3.5 w-3.5" />
        Unlisted galleries never appear on the public archive.
      </p>
    </div>
  );
}
