"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/format";

export function StudioSignOut({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/signin");
        router.refresh();
      }}
      className={cn(
        "flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition",
        compact
          ? "text-teal-900/55 hover:text-teal-950"
          : "text-cream/50 hover:text-cream",
      )}
    >
      <LogOut className="h-3.5 w-3.5" />
      {!compact && "Sign out"}
    </button>
  );
}
