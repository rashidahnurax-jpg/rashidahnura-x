import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-teal-950 text-cream">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
      <div className="container-x grid gap-12 py-16 md:grid-cols-[1.2fr_1fr_1fr] md:py-20">
        <div>
          <Logo light />
          <p className="mt-6 max-w-xs text-[13px] leading-relaxed text-cream/55">
            Galleries, films and downloads for studios who care where their work lives — and who it reaches.
          </p>
          <p className="mt-6 text-[10px] uppercase tracking-[0.3em] text-gold/80">Intentional Intelligence</p>
        </div>

        <div className="space-y-3">
          <p className="label text-cream/40">Explore</p>
          <FooterLink href="/galleries">Featured galleries</FooterLink>
          <FooterLink href="/flagship">65th Inaugural Lecture</FooterLink>
          <FooterLink href="/signin">Studio sign in</FooterLink>
        </div>

        <div className="space-y-3">
          <p className="label text-cream/40">Trust</p>
          <p className="text-[13px] leading-relaxed text-cream/55">
            Four access modes. Server-side permissions. Expiring and revocable links.
          </p>
          <p className="pt-2 text-[13px] text-cream/55">Nasarawa State University, Keffi</p>
        </div>
      </div>

      <div className="container-x flex flex-col gap-3 border-t border-cream/10 py-7 text-[10px] uppercase tracking-[0.24em] text-cream/35 sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} NURA-X STUDIO</span>
        <span>Built with intention · Keffi, Nigeria</span>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-1.5 text-[13px] text-cream/70 transition hover:text-turquoise"
    >
      {children}
      <ArrowUpRight className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
    </Link>
  );
}
