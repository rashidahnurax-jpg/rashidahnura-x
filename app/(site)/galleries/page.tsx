import Link from "next/link";
import { ArrowUpRight, Lock, Mail, ShieldCheck } from "lucide-react";
import { ready } from "@/lib/db";
import { featuredGalleries } from "@/lib/data";
import { AccessBadge } from "@/components/ui/Badges";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Galleries",
  description: "Featured galleries published by studios on NURA-X.",
};

export default async function GalleriesPage() {
  await ready();
  const galleries = featuredGalleries(24);

  return (
    <>
      <section className="relative overflow-hidden bg-teal-950 text-cream">
        <div className="pointer-events-none absolute -right-24 top-0 h-[380px] w-[380px] rounded-full bg-turquoise/10 blur-[100px]" />
        <div className="container-x relative py-14 md:py-20">
          <p className="label text-gold">The public archive</p>
          <div className="mt-4 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <h1 className="max-w-2xl font-serif text-5xl leading-[0.98] md:text-[68px]">
              Galleries, opened <em className="italic text-turquoise">with intention.</em>
            </h1>
            <p className="max-w-sm text-[13px] leading-relaxed text-cream/55">
              Only galleries a studio explicitly features appear here. Everything else stays unlisted,
              shared by its link alone.
            </p>
          </div>
        </div>
        <div className="container-x relative flex flex-wrap gap-x-7 gap-y-2 border-t border-cream/10 py-4 text-[9px] uppercase tracking-[0.24em] text-cream/40">
          <span className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-gold" /> Server-enforced access</span>
          <span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-gold" /> Four modes</span>
          <span className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-gold" /> Expiring links</span>
        </div>
      </section>

      <section className="container-x py-12 md:py-20">
        {galleries.length === 0 ? (
          <div className="mx-auto max-w-lg rounded-sm border border-teal-900/10 bg-cream p-10 text-center">
            <p className="font-serif text-2xl text-teal-950">Nothing featured yet.</p>
            <p className="mt-2 text-sm leading-relaxed text-ink/60">
              Studios choose when a gallery joins the public archive. If you were given a link, open it directly.
            </p>
            <Link href="/" className="btn-outline mt-6">Return home</Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {galleries.map((gallery, index) => (
              <Link
                key={gallery.id}
                href={`/g/${gallery.slug}`}
                className="group overflow-hidden rounded-sm border border-teal-900/10 bg-white transition hover:border-gold/50 hover:shadow-lift"
              >
                <div className="relative overflow-hidden bg-teal-950">
                  {gallery.cover_url ? (
                    <img
                      src={gallery.cover_url}
                      alt={gallery.title}
                      loading={index < 3 ? "eager" : "lazy"}
                      className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center p-6">
                      <span className="font-serif text-2xl text-cream/70">{gallery.title}</span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-teal-950/85 to-transparent p-4 pt-12">
                    <span className="flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-cream/65">
                      {gallery.studio_name}
                      <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:text-turquoise" />
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <AccessBadge mode={gallery.access_mode} />
                    {gallery.kind === "flagship" && (
                      <span className="chip border-gold/40 bg-gold/10 text-gold-deep">Flagship</span>
                    )}
                  </div>
                  <h2 className="mt-3 font-serif text-[26px] leading-tight text-teal-950">{gallery.title}</h2>
                  {gallery.subtitle && <p className="mt-1 font-serif text-sm italic text-ink/50">{gallery.subtitle}</p>}
                  <p className="mt-4 flex items-center justify-between border-t border-teal-900/10 pt-3 text-[11px] text-ink/45">
                    <span>{gallery.photo_count} photographs{gallery.video_count ? ` · ${gallery.video_count} films` : ""}</span>
                    {gallery.published_at && <span>{formatDate(gallery.published_at)}</span>}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
