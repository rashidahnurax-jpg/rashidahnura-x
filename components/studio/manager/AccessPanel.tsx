"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Check, KeyRound, Link2, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { ACCESS_MODES } from "@/lib/access-modes";
import { cn } from "@/lib/format";
import type { ManagerAccessMode, ManagerGallery } from "./ManagerTypes";

const ICONS = { open: Link2, email: Mail, invite: KeyRound, password: Lock } as const;

export function AccessPanel({
  gallery,
  emails,
  patchGallery,
  reload,
  setNotice,
}: {
  gallery: ManagerGallery;
  emails: string[];
  patchGallery: (payload: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
  reload: () => Promise<void>;
  setNotice: (text: string, tone?: "success" | "error") => void;
}) {
  const [mode, setMode] = useState<ManagerAccessMode>(gallery.access_mode);
  const [photoDownloads, setPhotoDownloads] = useState(Boolean(gallery.allow_photo_downloads));
  const [videoDownloads, setVideoDownloads] = useState(Boolean(gallery.allow_video_downloads));
  const [password, setPassword] = useState("");
  const [emailsText, setEmailsText] = useState(emails.join("\n"));
  const [expiry, setExpiry] = useState(gallery.expires_at ? gallery.expires_at.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMode(gallery.access_mode);
    setPhotoDownloads(Boolean(gallery.allow_photo_downloads));
    setVideoDownloads(Boolean(gallery.allow_video_downloads));
    setExpiry(gallery.expires_at ? gallery.expires_at.slice(0, 10) : "");
    setEmailsText(emails.join("\n"));
    setPassword("");
  }, [gallery.access_mode, gallery.allow_photo_downloads, gallery.allow_video_downloads, gallery.expires_at, emails]);

  const parsedEmails = emailsText
    .split(/[\s,;]+/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const uniqueEmails = Array.from(new Set(parsedEmails));
  const modeChanged = mode !== gallery.access_mode;
  const dirty =
    modeChanged ||
    photoDownloads !== Boolean(gallery.allow_photo_downloads) ||
    videoDownloads !== Boolean(gallery.allow_video_downloads) ||
    expiry !== (gallery.expires_at ? gallery.expires_at.slice(0, 10) : "") ||
    password.length > 0 ||
    uniqueEmails.join(",") !== emails.join(",");

  async function save() {
    setError(null);
    if (mode === "password" && !gallery.has_password && password.trim().length < 8) {
      setError("Set a gallery password of at least 8 characters.");
      return;
    }
    if (password.length > 0 && password.trim().length < 8) {
      setError("Passwords need at least 8 characters.");
      return;
    }
    if (mode === "invite" && uniqueEmails.length === 0) {
      setError("Add at least one approved email, or the gallery cannot be published.");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      accessMode: mode,
      allowPhotoDownloads: photoDownloads,
      allowVideoDownloads: videoDownloads,
      invitedEmails: uniqueEmails,
      expiresAt: expiry || null,
    };
    if (password.trim()) payload.password = password.trim();

    const result = await patchGallery(payload);
    if (!result.ok) {
      setSaving(false);
      setError(result.error ?? "Could not save access settings.");
      return;
    }
    await reload();
    setSaving(false);
    setNotice(modeChanged ? "Access updated. Earlier unlocks were re-locked." : "Access settings saved.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-sm border border-teal-900/10 bg-white p-5 md:p-6">
        <p className="label text-gold-deep">Who may enter</p>
        <h2 className="mt-2 font-serif text-2xl text-teal-950">One mode for this gallery</h2>
        <p className="mt-2 text-[12px] leading-relaxed text-ink/50">
          Access is enforced by the server for every preview, film and download request.
        </p>

        <div className="mt-5 space-y-2">
          {ACCESS_MODES.map((option) => {
            const Icon = ICONS[option.id];
            const active = mode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setMode(option.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-sm border p-4 text-left transition",
                  active ? "border-turquoise-deep bg-cream" : "border-teal-900/12 bg-white hover:border-teal-900/25",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
                    active ? "border-turquoise-deep bg-turquoise/20 text-teal-950" : "border-teal-900/15 text-teal-900/45",
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-teal-950">{option.label}</span>
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                        active ? "border-turquoise-deep bg-turquoise-deep text-cream" : "border-teal-900/20",
                      )}
                    >
                      {active && <Check className="h-2.5 w-2.5" />}
                    </span>
                  </span>
                  <span className="mt-1 block text-[11.5px] leading-relaxed text-ink/50">{option.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        {mode === "email" && (
          <p className="mt-4 flex items-start gap-2 rounded-sm border border-teal-900/10 bg-cream p-3 text-[11.5px] leading-relaxed text-ink/55">
            <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-deep" />
            Guests browse without a prompt. The email step appears the first time they download a permitted file.
          </p>
        )}

        {mode === "password" && (
          <div className="mt-5 rounded-sm border border-teal-900/10 bg-cream-soft p-4">
            <label htmlFor="gallery-password" className="field-label">
              {gallery.has_password ? "Replace the password" : "Gallery password"}
            </label>
            <input
              id="gallery-password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field mt-2"
              placeholder={gallery.has_password ? "Leave blank to keep the current password" : "At least 8 characters"}
              autoComplete="new-password"
            />
            <p className="mt-2 text-[10.5px] text-ink/40">
              {gallery.has_password ? "A password is currently set. " : ""}Guests enter this shared password once per device.
            </p>
          </div>
        )}

        {mode === "invite" && (
          <div className="mt-5 rounded-sm border border-teal-900/10 bg-cream-soft p-4">
            <label htmlFor="gallery-emails" className="field-label">Approved emails</label>
            <textarea
              id="gallery-emails"
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
              className="field mt-2 min-h-[110px] resize-y text-[12px]"
              placeholder={"one@example.com\nanother@example.com"}
            />
            <p className="mt-2 text-[10.5px] text-ink/40">
              {uniqueEmails.length} approved email{uniqueEmails.length === 1 ? "" : "s"}. Each guest unlocks with a one-time code sent to
              the gallery email. Only approved addresses pass.
            </p>
          </div>
        )}

        {modeChanged && (
          <p className="mt-4 flex items-start gap-2 rounded-sm border border-amber-700/20 bg-amber-50 p-3 text-[11.5px] leading-relaxed text-amber-900">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Changing the access mode re-locks everyone who already unlocked this gallery. The link itself stays the same.
          </p>
        )}
      </section>

      <div className="space-y-6">
        <section className="rounded-sm border border-teal-900/10 bg-white p-5 md:p-6">
          <p className="label text-gold-deep">Downloads</p>
          <h2 className="mt-2 font-serif text-2xl text-teal-950">What guests may keep</h2>
          <div className="mt-4 space-y-2">
            <DownloadToggle
              label="Photographs"
              description="Full-resolution originals, one by one or as a ZIP."
              checked={photoDownloads}
              onChange={setPhotoDownloads}
            />
            <DownloadToggle
              label="Films"
              description="Original uploaded video files. YouTube entries only when an original is attached."
              checked={videoDownloads}
              onChange={setVideoDownloads}
            />
          </div>
          <p className="mt-3 text-[10.5px] leading-relaxed text-ink/35">
            Downloads are always free to guests. Disabling them hides the controls and blocks direct file requests.
          </p>
        </section>

        <section className="rounded-sm border border-teal-900/10 bg-white p-5 md:p-6">
          <p className="label text-gold-deep">Expiry</p>
          <h2 className="mt-2 font-serif text-2xl text-teal-950">An end date, if you want one</h2>
          <div className="mt-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-teal-900/35" />
            <input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="field h-10 flex-1 px-3 py-2 text-[12px]"
              aria-label="Gallery expiry date"
            />
            {expiry && (
              <button type="button" onClick={() => setExpiry("")} className="btn-ghost px-2.5 py-2 text-[10px]">
                Clear
              </button>
            )}
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-ink/35">
            From the day after the selected date, protected previews and files stop responding. The page shows an
            expiry notice instead.
          </p>
        </section>

        <section className="rounded-sm border border-teal-900/10 bg-cream p-5">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-900/50">
            <ShieldCheck className="h-3.5 w-3.5 text-gold-deep" /> Enforced server-side
          </p>
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink/55">
            Direct file links are checked on every request, so a revoked or expired gallery cannot leak originals
            through a saved URL.
          </p>
        </section>
      </div>

      <div className="lg:col-span-2">
        <div className="flex flex-col gap-3 rounded-sm border border-teal-900/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
          <span className={cn("text-[10px] uppercase tracking-[0.18em]", dirty ? "text-gold-deep" : "text-teal-900/25")}>
            {dirty ? "Unsaved access changes" : "Access settings saved"}
          </span>
          <div className="flex items-center gap-2">
            {error && <span className="text-[11.5px] text-red-800">{error}</span>}
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty}
              className="btn-primary px-5 py-2.5 text-[10px] disabled:opacity-40"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save access
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DownloadToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-start gap-3 rounded-sm border p-3.5 text-left transition",
        checked ? "border-turquoise-deep/50 bg-cream/70" : "border-teal-900/10 bg-white",
      )}
      aria-pressed={checked}
    >
      <span
        className={cn(
          "mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition",
          checked ? "bg-teal-900" : "bg-teal-900/15",
        )}
      >
        <span className={cn("h-4 w-4 rounded-full bg-cream-soft transition", checked && "translate-x-4")} />
      </span>
      <span>
        <span className="block text-[12px] font-semibold text-teal-950">{label}</span>
        <span className="mt-0.5 block text-[10.5px] leading-relaxed text-ink/45">{description}</span>
      </span>
    </button>
  );
}
