import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  Check,
  Clapperboard,
  Download,
  Film,
  Globe2,
  KeyRound,
  Link2,
  Lock,
  Mail,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ready, get } from "@/lib/db";
import { featuredGalleries, getMediaItems } from "@/lib/data";
import { ACCESS_MODES } from "@/lib/config";
import { formatDate, formatBytes } from "@/lib/format";
import { AccessBadge } from "@/components/ui/Badges";
import type { GalleryRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const MODE_ICONS = {
  open: Link2,
  email: Mail,
  invite: KeyRound,
  password: Lock,
} as const;

export default async function HomePage() {
  await ready();
  const featured = featuredGalleries(3);
  const flagship = get<GalleryRow>("SELECT * FROM galleries WHERE kind = 'flagship' ORDER BY created_at ASC LIMIT 1");
  const flagshipItems = flagship ? getMediaItems(flagship.id) : [];
  const flagshipFilms = flagshipItems.filter((i) => i.kind === "video" || i.kind === "youtube");
  const flagshipPhotos = flagshipItems.filter((i) => i.kind === "photo");
  const lead = featured[0];
  const spotlight = featured.find((g) => g.kind === "flagship") ?? lead;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-teal-950 text-cream">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -left-40 top-0 h-[520px] w-[520px] rounded-full bg-turquoise/10 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-gold/10 blur-[110px]" />
        </div>
        <div className="container-x relative grid gap-12 pb-16 pt-12 md:pb-24 md:pt-16 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:pt-20">
          <div className="animate-fadeUp">
            <p className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-cream/50">
              <span className="h-1.5 w-1.5 rounded-full bg-turquoise" />
              Keffi, Nigeria · Gallery platform
            </p>
            <h1 className="mt-7 max-w-2xl font-serif text-[44px] leading-[0.98] tracking-[-0.01em] text-cream sm:text-6xl lg:text-[76px]">
              The work deserves more than{" "}
              <em className="font-serif italic text-turquoise">a folder.</em>
            </h1>
            <p className="mt-7 max-w-lg text-[15px] leading-relaxed text-cream/65">
              A photography-led home for studios who share with intention. Chapters, films and downloads —
              delivered through one considered link, on the terms you choose.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/galleries" className="btn-turquoise group">
                Explore galleries
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" strokeWidth={1.8} />
              </Link>
              <Link href="/signin" className="btn border border-cream/25 px-6 py-3.5 text-cream hover:border-cream/60 hover:bg-cream/5">
                Studio sign in
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-cream/10 pt-6 text-[10px] uppercase tracking-[0.18em] text-cream/40">
              <span className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-gold" /> Server-side permissions</span>
              <span className="flex items-center gap-2"><Download className="h-3.5 w-3.5 text-gold" /> Free client downloads</span>
              <span className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-gold" /> Four access modes</span>
            </div>
          </div>

          <div className="relative animate-fadeUp lg:pt-2" style={{ animationDelay: "120ms" }}>
            <div className="relative rounded-sm border border-gold/35 bg-cream p-2.5 shadow-lift sm:p-3">
              <div className="overflow-hidden rounded-[1px] bg-teal-900">
                {/* The official banner is shown whole — never cropped. */}
                <img
                  src="/brand/banner.jpg"
                  alt="65th Inaugural Lecture Series of NSUK — Intentional Intelligence: From Digital Trust to Human Flourishing, with Professor Rashidah Funke Olanrewaju"
                  width={2400}
                  height={800}
                  className="block h-auto w-full"
                  fetchPriority="high"
                />
              </div>
              <div className="flex items-center justify-between gap-3 px-1.5 pb-1 pt-3">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-gold-deep">The flagship gallery</p>
                  <p className="mt-1 font-serif text-[15px] leading-tight text-teal-950">65th Inaugural Lecture · NSUK</p>
                </div>
                <Link
                  href={flagship ? `/g/${flagship.slug}` : "/galleries"}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-teal-900/20 text-teal-900 transition hover:border-gold hover:text-gold-deep"
                  aria-label="Open the flagship gallery"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="absolute -bottom-10 left-3 hidden w-[230px] rounded-sm border border-gold/30 bg-cream p-2 shadow-lift sm:block lg:-bottom-12 lg:left-6">
              <img
                src="/brand/portrait-1200.jpg"
                alt="Professor Rashidah Funke Olanrewaju in academic dress"
                width={1200}
                height={1200}
                className="aspect-square w-full rounded-[1px] object-cover object-top"
              />
              <p className="px-1 pb-1 pt-2 text-[8px] font-semibold uppercase tracking-[0.2em] text-teal-900/60">
                Prof. Rashidah Funke Olanrewaju
              </p>
            </div>
          </div>
        </div>

        <div className="relative border-t border-cream/10">
          <div className="container-x flex flex-wrap items-center gap-x-8 gap-y-2 py-4 text-[9px] font-semibold uppercase tracking-[0.28em] text-cream/35">
            <span className="text-gold">Galleries</span>
            <span>·</span>
            <span>Chapters</span>
            <span>·</span>
            <span>Films</span>
            <span>·</span>
            <span>Selections</span>
            <span>·</span>
            <span>Downloads</span>
            <span>·</span>
            <span>One link</span>
          </div>
        </div>
      </section>

      {/* Featured galleries */}
      <section className="container-x py-16 md:py-24">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label text-gold-deep">Chosen by the studios</p>
            <h2 className="mt-3 max-w-xl font-serif text-4xl leading-[1.02] text-teal-950 md:text-[54px]">
              Featured <em className="italic">galleries</em>
            </h2>
          </div>
          <Link href="/galleries" className="group flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-900/70 hover:text-teal-950">
            View the public archive
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </Link>
        </div>

        {spotlight ? (
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.55fr_1fr]">
            <Link
              href={`/g/${spotlight.slug}`}
              className="group relative overflow-hidden rounded-sm border border-teal-900/10 bg-teal-950"
            >
              {spotlight.cover_url ? (
                <img
                  src={spotlight.cover_url}
                  alt={spotlight.title}
                  className="h-full min-h-[320px] w-full object-cover transition duration-700 group-hover:scale-[1.03] md:min-h-[440px]"
                />
              ) : (
                <div className="flex min-h-[320px] items-center justify-center bg-teal-900 md:min-h-[440px]">
                  <span className="font-serif text-3xl text-cream/70">{spotlight.title}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-teal-950/90 via-teal-950/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                <div className="mb-4 flex flex-wrap gap-2">
                  <AccessBadge mode={spotlight.access_mode} className="border-cream/25 bg-teal-950/40 text-cream/80" />
                  <span className="chip border-cream/20 bg-teal-950/40 text-cream/70">
                    {spotlight.photo_count} photographs{spotlight.video_count ? ` · ${spotlight.video_count} films` : ""}
                  </span>
                </div>
                <h3 className="font-serif text-3xl leading-tight text-cream md:text-4xl">{spotlight.title}</h3>
                {spotlight.subtitle && <p className="mt-1 font-serif text-base italic text-cream/65">{spotlight.subtitle}</p>}
                <p className="mt-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-cream/50">
                  {spotlight.studio_name}
                  {spotlight.published_at && <span>· {formatDate(spotlight.published_at, { month: "long", year: "numeric" })}</span>}
                </p>
              </div>
              <span className="absolute right-6 top-6 flex h-11 w-11 items-center justify-center rounded-full border border-cream/30 bg-cream/10 text-cream backdrop-blur transition group-hover:bg-turquoise group-hover:text-teal-950">
                <ArrowUpRight className="h-5 w-5" />
              </span>
            </Link>

            <div className="flex flex-col justify-between gap-8 rounded-sm border border-teal-900/10 bg-cream p-7 md:p-9">
              <div>
                <p className="label text-gold-deep">A note on intention</p>
                <p className="mt-4 font-serif text-2xl leading-snug text-teal-950 md:text-[28px]">
                  “A gallery is not storage. It is a decision about who gets to feel the work.”
                </p>
                <p className="mt-4 text-[13px] leading-relaxed text-ink/60">
                  NURA-X keeps every original, every permission and every expiry under the studio&apos;s hand.
                  Only galleries a studio chooses to feature appear here — everything else stays unlisted, shared by
                  link alone.
                </p>
              </div>

              <div className="space-y-3 border-t border-teal-900/10 pt-6">
                {[
                  { icon: Camera, text: "Lightweight previews, full-resolution originals" },
                  { icon: Film, text: "YouTube films with optional original files" },
                  { icon: Check, text: "Client selections and free permitted downloads" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-3 text-[13px] text-ink/70">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" strokeWidth={1.8} />
                    {text}
                  </div>
                ))}
              </div>

              <Link href="/signin" className="btn-outline w-full">
                Open a studio workspace
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-10 rounded-sm border border-teal-900/10 bg-cream p-10 text-center">
            <p className="font-serif text-2xl text-teal-950">The public archive is being curated.</p>
            <p className="mt-2 text-sm text-ink/60">Studios choose which galleries appear here.</p>
          </div>
        )}
      </section>

      {/* Flagship */}
      {flagship && (
        <section className="relative overflow-hidden border-y border-teal-900/10 bg-cream">
          <div className="container-x grid items-center gap-10 py-16 md:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div className="relative mx-auto w-full max-w-[430px] lg:mx-0">
              <div className="absolute -left-3 -top-3 h-full w-full rounded-sm border border-gold/40" aria-hidden />
              <div className="relative rounded-sm border border-teal-900/10 bg-white p-2.5 shadow-lift">
                <img
                  src="/brand/portrait-1200.jpg"
                  alt="Professor Rashidah Funke Olanrewaju, Inaugural Lecturer"
                  width={1200}
                  height={1200}
                  className="w-full object-cover object-top"
                />
                <div className="flex items-center justify-between gap-4 px-1 pb-1 pt-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-gold-deep">Meet the Inaugural Lecturer</p>
                    <p className="mt-1 font-serif text-[15px] leading-tight text-teal-950">Professor Rashidah Funke Olanrewaju</p>
                  </div>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-gold/50 font-serif text-xs text-gold-deep">65</span>
                </div>
              </div>
            </div>

            <div>
              <p className="label text-gold-deep">The flagship gallery · {formatDate(flagship.published_at)}</p>
              <h2 className="mt-4 font-serif text-[42px] leading-[0.98] text-teal-950 md:text-[62px]">
                Intentional <em className="italic">Intelligence</em>
              </h2>
              <p className="mt-2 font-serif text-xl italic text-teal-900/60 md:text-2xl">
                From Digital Trust to Human Flourishing
              </p>

              <div className="mt-7 grid max-w-lg grid-cols-2 gap-5 border-y border-teal-900/10 py-5">
                <div>
                  <p className="label text-teal-900/40">Series</p>
                  <p className="mt-1.5 text-[13px] leading-snug text-ink/75">65th Inaugural Lecture Series of NSUK</p>
                </div>
                <div>
                  <p className="label text-teal-900/40">Institution</p>
                  <p className="mt-1.5 text-[13px] leading-snug text-ink/75">Nasarawa State University, Keffi</p>
                </div>
                <div>
                  <p className="label text-teal-900/40">In the gallery</p>
                  <p className="mt-1.5 text-[13px] text-ink/75">{flagshipPhotos.length} photographs · {flagshipFilms.length} films</p>
                </div>
                <div>
                  <p className="label text-teal-900/40">Access</p>
                  <p className="mt-1.5 text-[13px] text-ink/75">Open link · free downloads</p>
                </div>
              </div>

              <p className="mt-6 max-w-xl text-[14px] leading-relaxed text-ink/65">
                The 65th Inaugural Lecture of Nasarawa State University, Keffi, delivered by Professor Rashidah
                Funke Olanrewaju — a study in intelligence with intention, and in trust that is designed rather than
                assumed.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={`/g/${flagship.slug}`} className="btn-primary">
                  Enter the lecture gallery
                  <ArrowRight className="h-4 w-4" />
                </Link>
                {flagshipFilms.length > 0 && (
                  <Link href={`/g/${flagship.slug}#films`} className="btn-outline">
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Watch lecture
                  </Link>
                )}
              </div>

              {flagshipFilms.length === 0 && (
                <p className="mt-5 flex items-center gap-2 text-[11px] text-teal-900/45">
                  <Clapperboard className="h-3.5 w-3.5" />
                  Watch lecture appears here once the studio adds the film.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Access modes */}
      <section id="access" className="container-x py-16 md:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <p className="label text-gold-deep">Access, on your terms</p>
            <h2 className="mt-3 font-serif text-4xl leading-[1.02] text-teal-950 md:text-[52px]">
              You decide how the <em className="italic">door opens.</em>
            </h2>
            <p className="mt-5 max-w-md text-[14px] leading-relaxed text-ink/60">
              Set one mode per gallery. Every preview, film and download is checked on the server — not hidden in
              the browser.
            </p>
            <div className="mt-8 max-w-md space-y-3 rounded-sm border border-teal-900/10 bg-cream p-5">
              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-900/50">
                <ShieldCheck className="h-4 w-4 text-gold-deep" /> Always enforced
              </p>
              <p className="text-[13px] leading-relaxed text-ink/65">
                Expired and revoked links stop new requests for protected files immediately. Revoking a link also
                invalidates earlier unlocks.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {ACCESS_MODES.map((mode, i) => {
              const Icon = MODE_ICONS[mode.id];
              return (
                <div
                  key={mode.id}
                  className="group relative overflow-hidden rounded-sm border border-teal-900/10 bg-white p-5 transition hover:border-gold/50 md:p-6"
                >
                  <span className="font-serif text-[11px] text-gold-deep">0{i + 1}</span>
                  <Icon className="mt-4 h-6 w-6 text-teal-800" strokeWidth={1.4} />
                  <h3 className="mt-4 font-serif text-xl leading-tight text-teal-950">{mode.label}</h3>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-ink/60">{mode.description}</p>
                  <span className="absolute inset-x-0 bottom-0 h-px scale-x-0 bg-gold transition-transform duration-500 group-hover:scale-x-100" />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Studios */}
      <section id="studios" className="relative overflow-hidden bg-teal-950 text-cream">
        <div className="absolute inset-0 opacity-60">
          <div className="absolute right-0 top-0 h-[360px] w-[360px] rounded-full bg-turquoise/10 blur-[100px]" />
        </div>
        <div className="container-x relative grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="label text-gold">For studios</p>
            <h2 className="mt-4 max-w-xl font-serif text-4xl leading-[1.02] text-cream md:text-[54px]">
              Built for the way studios <em className="italic text-turquoise">actually share.</em>
            </h2>
            <p className="mt-5 max-w-lg text-[14px] leading-relaxed text-cream/60">
              Start private. Build the story in chapters. Publish to the same link whenever the gallery is ready.
            </p>

            <div className="mt-9 space-y-6">
              {[
                {
                  n: "01",
                  title: "Create, then curate",
                  body: "Name the gallery, choose a cover, arrange chapters. Preview the customer experience on desktop and mobile before anyone else sees it.",
                },
                {
                  n: "02",
                  title: "Upload without fear",
                  body: "Batched, resumable uploads with per-file progress and retry. Photos keep their full-resolution originals; videos keep theirs too.",
                },
                {
                  n: "03",
                  title: "Share one considered link",
                  body: "Copy it or send it on WhatsApp. Update the gallery, change the expiry, or unpublish — the link stays the same.",
                },
              ].map((step) => (
                <div key={step.n} className="flex gap-5 border-t border-cream/10 pt-5">
                  <span className="font-serif text-sm text-gold">{step.n}</span>
                  <div>
                    <h3 className="font-serif text-lg text-cream">{step.title}</h3>
                    <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-cream/55">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link href="/signin" className="btn-turquoise mt-9">
              Studio sign in
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mx-auto w-full max-w-[330px]">
            <div className="relative rounded-[34px] border border-cream/20 bg-teal-900 p-2.5 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.8)]">
              <div className="overflow-hidden rounded-[26px] bg-cream-soft">
                <div className="relative">
                  <img src="/brand/banner.jpg" alt="Gallery cover preview" className="aspect-[3/2] w-full object-cover object-left" />
                  <div className="absolute inset-0 bg-gradient-to-t from-teal-950/70 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="text-[7px] uppercase tracking-[0.22em] text-turquoise">Private draft · preview</p>
                    <p className="mt-1 font-serif text-lg leading-tight text-cream">Intentional Intelligence</p>
                    <p className="text-[9px] italic text-cream/60">From Digital Trust to Human Flourishing</p>
                  </div>
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-semibold uppercase tracking-[0.18em] text-teal-900/50">Chapter II · The Occasion</span>
                    <span className="text-[8px] text-teal-900/40">12 frames</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <img src="/brand/portrait-1200.jpg" alt="" className="col-span-2 aspect-[4/3] w-full rounded-[2px] object-cover object-top" />
                    <div className="aspect-[4/3] w-full rounded-[2px] bg-teal-900/90" />
                    <div className="aspect-[4/3] w-full rounded-[2px] bg-gold/60" />
                    <div className="col-span-2 flex items-center justify-between rounded-[2px] bg-teal-900 px-2">
                      <span className="text-[7px] uppercase tracking-[0.14em] text-cream/60">Selection tray</span>
                      <span className="rounded-full bg-turquoise px-1.5 py-0.5 text-[7px] font-bold text-teal-950">2</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    <span className="flex-1 rounded-sm bg-teal-900 py-1.5 text-center text-[7px] uppercase tracking-[0.16em] text-cream">Download 2</span>
                    <span className="flex-1 rounded-sm border border-teal-900/20 py-1.5 text-center text-[7px] uppercase tracking-[0.16em] text-teal-900">Share</span>
                  </div>
                </div>
              </div>
              <div className="absolute -right-3 top-16 hidden rotate-2 rounded-sm border border-gold/40 bg-cream px-2.5 py-1.5 text-[7px] font-semibold uppercase tracking-[0.16em] text-teal-900 shadow-lift sm:block">
                {flagshipPhotos[0] ? `Original · ${formatBytes(flagshipPhotos[0].size_bytes)}` : "Full resolution"}
              </div>
            </div>
            <p className="mt-5 text-center text-[9px] uppercase tracking-[0.24em] text-cream/35">The customer view, everywhere</p>
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="container-x py-16 md:py-24">
        <div className="relative overflow-hidden rounded-sm border border-gold/30 bg-cream px-6 py-12 text-center md:px-16 md:py-16">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
          <img src="/brand/nurax-logo-640.png" alt="NURA-X emblem" width={640} height={640} className="mx-auto h-16 w-16 rounded-full object-contain" />
          <h2 className="mx-auto mt-6 max-w-2xl font-serif text-4xl leading-[1.05] text-teal-950 md:text-[52px]">
            One link. Every frame <em className="italic">accounted for.</em>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[14px] leading-relaxed text-ink/60">
            Photography-led galleries, films, and free client downloads — shared with the same care you made the
            work with.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/galleries" className="btn-primary">
              Explore galleries
              <Globe2 className="h-4 w-4" />
            </Link>
            <Link href="/signin" className="btn-outline">
              Studio sign in
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
