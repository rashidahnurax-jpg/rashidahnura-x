import { Clock, Globe2, KeyRound, Link2, Lock, Mail, Ban } from "lucide-react";
import { cn, isExpired } from "@/lib/format";
import type { GalleryRow } from "@/lib/types";

export function StatusBadge({
  gallery,
  className,
}: {
  gallery: Pick<GalleryRow, "status" | "expires_at" | "revoked_at" | "access_mode">;
  className?: string;
}) {
  let label = "Draft";
  let tone = "border-teal-900/15 bg-teal-900/[0.04] text-teal-900/70";
  let Icon = Clock;

  if (gallery.revoked_at) {
    label = "Link revoked";
    tone = "border-red-800/20 bg-red-800/[0.06] text-red-900/80";
    Icon = Ban;
  } else if (gallery.status === "published" && isExpired(gallery.expires_at)) {
    label = "Expired";
    tone = "border-amber-700/25 bg-amber-600/[0.08] text-amber-900";
    Icon = Clock;
  } else if (gallery.status === "published") {
    label = "Live";
    tone = "border-turquoise-deep/25 bg-turquoise/15 text-teal-900";
    Icon = Globe2;
  } else if (gallery.status === "unpublished") {
    label = "Unpublished";
    tone = "border-teal-900/15 bg-teal-900/[0.04] text-teal-900/70";
    Icon = Ban;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
        tone,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

const MODE_ICONS = {
  open: Link2,
  email: Mail,
  invite: KeyRound,
  password: Lock,
} as const;

const MODE_LABELS = {
  open: "Open link",
  email: "Email gate",
  invite: "Invite only",
  password: "Password",
} as const;

export function AccessBadge({ mode, className }: { mode: keyof typeof MODE_ICONS; className?: string }) {
  const Icon = MODE_ICONS[mode] ?? Link2;
  return (
    <span className={cn("chip", className)}>
      <Icon className="h-3 w-3 text-gold-deep" />
      {MODE_LABELS[mode] ?? "Open link"}
    </span>
  );
}

export function AccessBadgeLight({ mode, className }: { mode: keyof typeof MODE_ICONS; className?: string }) {
  const Icon = MODE_ICONS[mode] ?? Link2;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-cream/25 bg-teal-950/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-cream/80 backdrop-blur", className)}>
      <Icon className="h-3 w-3 text-turquoise" />
      {MODE_LABELS[mode] ?? "Open link"}
    </span>
  );
}
