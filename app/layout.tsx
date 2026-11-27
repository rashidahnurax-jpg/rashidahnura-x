import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/fraunces/full-italic.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "NURA-X STUDIO — Intentional galleries",
    template: "%s · NURA-X STUDIO",
  },
  description:
    "NURA-X STUDIO is a private-by-design gallery platform for photographers, filmmakers and studios. Create chapters, share one link, and let clients view and download what you permit.",
  applicationName: "NURA-X STUDIO",
  authors: [{ name: "NURA-X STUDIO" }],
  openGraph: {
    type: "website",
    siteName: "NURA-X STUDIO",
    title: "NURA-X STUDIO — Intentional galleries",
    description:
      "Intentional intelligence for image makers. Galleries, films and downloads — shared with a single, considered link.",
    images: [{ url: "/brand/og.jpg", width: 1200, height: 630, alt: "NURA-X STUDIO" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NURA-X STUDIO",
    description: "Intentional galleries, shared with one link.",
    images: ["/brand/og.jpg"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#082F2E",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
