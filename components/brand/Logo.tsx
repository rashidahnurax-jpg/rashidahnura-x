import Link from "next/link";
import { cn } from "@/lib/format";

export function Logo({
  href = "/",
  light = false,
  compact = false,
  className,
}: {
  href?: string | null;
  light?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const content = (
    <span className={cn("flex items-center gap-3", className)}>
      <img
        src="/brand/nurax-logo-320.png"
        alt="NURA-X emblem — a woman in a turquoise hijab within a gold ring"
        width={320}
        height={320}
        className={cn("shrink-0 rounded-full object-contain", compact ? "h-10 w-10" : "h-[52px] w-[52px]")}
      />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-sans font-extrabold tracking-[0.16em]",
            compact ? "text-[15px]" : "text-[17px] sm:text-[19px]",
            light ? "text-cream" : "text-teal-950",
          )}
        >
          NURA-X
        </span>
        <span
          className={cn(
            "mt-1 font-semibold uppercase tracking-[0.5em]",
            compact ? "text-[8px]" : "text-[9px]",
            light ? "text-gold-light" : "text-gold-deep",
          )}
        >
          Studio
        </span>
      </span>
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} aria-label="NURA-X STUDIO home" className="group inline-flex">
      {content}
    </Link>
  );
}
