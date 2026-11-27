"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe2, Images, LayoutDashboard, Users } from "lucide-react";
import { cn } from "@/lib/format";

const LINKS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/studios", label: "Studios", icon: Users },
  { href: "/admin/galleries", label: "Galleries", icon: Images },
  { href: "/galleries", label: "Public site", icon: Globe2, external: true },
];

export function AdminNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const links = mobile ? LINKS.filter((link) => !link.external) : LINKS;

  return (
    <nav className={mobile ? "grid grid-cols-3" : "space-y-1"} aria-label="Admin">
      {links.map(({ href, label, icon: Icon, external }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        if (external) {
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-[12px] text-cream/55 transition hover:bg-cream/5 hover:text-cream"
            >
              <Icon className="h-4 w-4 text-gold" strokeWidth={1.7} />
              Public archive
            </Link>
          );
        }
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              mobile
                ? "flex flex-col items-center gap-1 py-3 text-[8.5px] font-semibold uppercase tracking-[0.12em]"
                : "flex items-center gap-3 rounded-sm px-3 py-2.5 text-[12.5px]",
              mobile
                ? active
                  ? "text-teal-950"
                  : "text-teal-900/45"
                : active
                  ? "bg-cream/[0.07] text-cream"
                  : "text-cream/55 hover:bg-cream/5 hover:text-cream",
            )}
          >
            <Icon className={cn("h-4 w-4", mobile ? (active ? "text-gold-deep" : "text-teal-900/40") : active ? "text-turquoise" : "text-gold")} strokeWidth={1.7} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
