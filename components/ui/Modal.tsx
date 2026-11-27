"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/format";

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  className,
  hideClose = false,
  dark = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
  hideClose?: boolean;
  dark?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-teal-950/60 backdrop-blur-sm"
      />
      <div
        className={cn(
          "relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-lg bg-cream-soft p-6 shadow-lift animate-slideUp sm:max-w-lg sm:rounded-sm sm:animate-fadeUp",
          dark && "bg-teal-950 text-cream",
          className,
        )}
      >
        {!hideClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={cn(
              "absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border transition",
              dark ? "border-cream/20 text-cream/70 hover:bg-cream/10" : "border-teal-900/15 text-teal-900/60 hover:bg-teal-900/5",
            )}
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {eyebrow && <p className={cn("label mb-2", dark ? "text-gold" : "text-gold-deep")}>{eyebrow}</p>}
        {title && <h3 className="pr-10 font-serif text-2xl leading-tight">{title}</h3>}
        <div className={cn(title || eyebrow ? "mt-4" : "")}>{children}</div>
      </div>
    </div>
  );
}
