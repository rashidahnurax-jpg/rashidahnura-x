"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/format";
import type { UserRow } from "@/lib/types";

const NAV = [
  { href: "/galleries", label: "Galleries" },
  { href: "/flagship", label: "The flagship" },
  { href: "/#access", label: "Access" },
  { href: "/#studios", label: "For studios" },
];

export function SiteHeader({ user }: { user: UserRow | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = open ? "hidden" : previousOverflow;
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const dashboard =
    user?.role === "admin" ? { href: "/admin", label: "Admin console" } : { href: "/studio", label: "Studio dashboard" };

  return (
    <header className="sticky top-0 z-40 border-b border-teal-900/10 bg-cream-soft/90 backdrop-blur-xl">
      <div className="container-x flex h-[76px] items-center justify-between gap-6">
        <Logo />

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-[12px] font-semibold uppercase tracking-[0.16em] text-teal-900/70 transition hover:text-teal-950",
                pathname === item.href && "text-teal-950",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <>
              <Link href={dashboard.href} className="btn-outline px-5 py-2.5">
                {dashboard.label}
              </Link>
              <SignOut />
            </>
          ) : (
            <>
              <Link href="/signin" className="text-[12px] font-semibold uppercase tracking-[0.16em] text-teal-900/70 transition hover:text-teal-950">
                Studio sign in
              </Link>
              <Link href="/signup" className="btn-outline px-4 py-2.5">
                Create account
              </Link>
              <Link href="/galleries" className="btn-primary px-5 py-2.5">
                Explore galleries
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.8} />
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-teal-900/15 text-teal-900 lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div
          id="mobile-navigation"
          className="fixed inset-x-0 bottom-0 top-[76px] z-40 flex flex-col bg-cream-soft px-5 pb-8 pt-6 lg:hidden"
        >
          <nav className="flex flex-col divide-y divide-teal-900/10 border-y border-teal-900/10" aria-label="Mobile">
            {NAV.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex animate-fadeUp items-center justify-between py-5 font-serif text-2xl text-teal-950 motion-reduce:animate-none"
                onClick={() => setOpen(false)}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {item.label}
                <ArrowUpRight className="h-5 w-5 text-gold" strokeWidth={1.5} />
              </Link>
            ))}
          </nav>
          <div className="mt-8 flex flex-col gap-3">
            {user ? (
              <>
                <Link href={dashboard.href} onClick={() => setOpen(false)} className="btn-primary w-full">
                  {dashboard.label}
                </Link>
                <SignOut full />
              </>
            ) : (
              <>
                <Link href="/galleries" onClick={() => setOpen(false)} className="btn-primary w-full">
                  Explore galleries
                </Link>
                <Link href="/signin" onClick={() => setOpen(false)} className="btn-outline w-full">
                  Studio sign in
                </Link>
                <Link href="/signup" onClick={() => setOpen(false)} className="btn-turquoise w-full">
                  Create a studio account
                </Link>
              </>
            )}
          </div>
          <p className="mt-auto pt-10 text-[11px] uppercase tracking-[0.28em] text-teal-900/40">
            Intentional Intelligence
          </p>
        </div>
      )}
    </header>
  );
}

function SignOut({ full = false }: { full?: boolean }) {
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/";
      }}
      className={cn(full ? "btn-ghost w-full justify-center" : "btn-ghost", "text-[11px] uppercase tracking-[0.16em]")}
    >
      Sign out
    </button>
  );
}
