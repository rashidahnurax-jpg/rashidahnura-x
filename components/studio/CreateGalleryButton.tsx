"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Link2, Loader2, Lock, Mail, KeyRound, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ACCESS_MODES } from "@/lib/access-modes";
import { cn } from "@/lib/format";

const ICONS = { open: Link2, email: Mail, invite: KeyRound, password: Lock } as const;

export function CreateGalleryButton({ full = false }: { full?: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [accessMode, setAccessMode] = useState<string>("open");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Give the gallery a title.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/studio/galleries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), subtitle: subtitle.trim(), accessMode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not create the gallery.");
        setBusy(false);
        return;
      }
      router.push(`/studio/g/${data.id}`);
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn("btn-primary", full && "w-full")}>
        <Plus className="h-4 w-4" />
        Create gallery
      </button>

      <Modal open={open} onClose={() => !busy && setOpen(false)} eyebrow="A new gallery" title="Start private. Publish when ready.">
        <form onSubmit={create} className="space-y-5">
          <div>
            <label htmlFor="gallery-title" className="field-label">Gallery title</label>
            <input
              id="gallery-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="field mt-2"
              placeholder="e.g. The Adeyemi Wedding"
              maxLength={120}
              autoFocus
              required
            />
          </div>
          <div>
            <label htmlFor="gallery-subtitle" className="field-label">Subtitle <span className="normal-case tracking-normal text-ink/35">(optional)</span></label>
            <input
              id="gallery-subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="field mt-2"
              placeholder="A line that sets the scene"
              maxLength={200}
            />
          </div>
          <div>
            <span className="field-label">How should it open?</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {ACCESS_MODES.map((mode) => {
                const Icon = ICONS[mode.id];
                const active = accessMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setAccessMode(mode.id)}
                    className={cn(
                      "rounded-sm border p-3 text-left transition",
                      active ? "border-turquoise-deep bg-cream shadow-sm" : "border-teal-900/12 bg-white hover:border-teal-900/25",
                    )}
                  >
                    <Icon className={cn("h-4 w-4", active ? "text-teal-900" : "text-teal-900/45")} strokeWidth={1.8} />
                    <span className="mt-2 block text-[12px] font-semibold text-teal-950">{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-sm border border-red-900/15 bg-red-50 px-3 py-2.5 text-[12px] text-red-800">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setOpen(false)} disabled={busy} className="btn-ghost justify-center">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {busy ? "Creating…" : "Create & add media"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
