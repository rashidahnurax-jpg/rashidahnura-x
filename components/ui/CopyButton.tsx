"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { cn } from "@/lib/format";

export function CopyButton({
  value,
  label = "Copy link",
  className,
  iconOnly = false,
}: {
  value: string;
  label?: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const el = document.createElement("textarea");
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(iconOnly ? "btn-ghost h-9 px-2.5" : "btn-outline px-4 py-2.5", className)}
      aria-label={label}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-turquoise-deep" /> : <Copy className="h-3.5 w-3.5" />}
      {!iconOnly && <span>{copied ? "Copied" : label}</span>}
    </button>
  );
}

export function WhatsAppShare({
  url,
  title,
  className,
  label = "Share on WhatsApp",
}: {
  url: string;
  title: string;
  className?: string;
  label?: string;
}) {
  const message = `${title} — view the gallery on NURA-X STUDIO: ${url}`;
  return (
    <a
      href={`https://wa.me/?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("btn-outline px-4 py-2.5", className)}
    >
      <MessageCircle className="h-3.5 w-3.5" />
      <span>{label}</span>
    </a>
  );
}
