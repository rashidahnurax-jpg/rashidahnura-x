const ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function extractYoutubeId(raw: string): string | null {
  const value = raw.trim();
  if (ID_RE.test(value)) return value;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && ID_RE.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (url.pathname === "/watch") {
        const id = url.searchParams.get("v");
        return id && ID_RE.test(id) ? id : null;
      }
      const match = url.pathname.match(/^\/(shorts|embed|live)\/([A-Za-z0-9_-]{11})/);
      if (match) return match[2];
    }
    if (host === "youtube-nocookie.com") {
      const match = url.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})/);
      if (match) return match[1];
    }
  } catch {
    return null;
  }
  return null;
}

export function youtubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function youtubeEmbed(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
}
