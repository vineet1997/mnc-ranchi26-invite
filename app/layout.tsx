import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { preload } from "react-dom";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const display = localFont({
  src: [
    { path: "../node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-italic.woff2", weight: "500", style: "italic" },
    { path: "../node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-italic.woff2", weight: "600", style: "italic" },
  ],
  variable: "--font-display",
  display: "swap",
});

const sans = localFont({
  src: "../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
  variable: "--font-sans",
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "SPACES Conference - Ranchi 2026",
  description:
    "Indian Trading Company welcomes Jharkhand's retail community to the SPACES Conference on 25 August 2026 at Lemon Tree Hotel, Ranchi.",
  applicationName: "SPACES Conference",
  category: "event",
  openGraph: {
    title: "A new chapter unfolds in Jharkhand",
    description: "SPACES Conference - 25 August 2026 - Lemon Tree Hotel, Ranchi",
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: "/spaces-ranchi-preview-v4.jpg?v=20260825",
        width: 1200,
        height: 630,
        alt: "Indian Trading Company invites Jharkhand retailers to the SPACES Conference in Ranchi",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "A new chapter unfolds in Jharkhand",
    description: "SPACES Conference - 25 August 2026 - Lemon Tree Hotel, Ranchi",
    images: ["/spaces-ranchi-preview-v4.jpg?v=20260825"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f1eadf",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  preload("/fabric-ivory-original.jpg", { as: "image", fetchPriority: "high" });

  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
