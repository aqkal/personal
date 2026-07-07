import type { Metadata, Viewport } from "next";
import { Inter, Press_Start_2P } from "next/font/google";
import Script from "next/script";
import { profile } from "@content";
import {
  jsonLdString,
  personJsonLd,
  siteUrl,
  webSiteJsonLd,
} from "@/lib/seo";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${profile.name} · Software Engineer`,
    template: `%s · ${profile.name}`,
  },
  description:
    "An explorable 3D Brisbane campus (and a terminal) that is also my software engineering portfolio. Walk through my experience, projects, and skills.",
  openGraph: {
    type: "website",
    siteName: `${profile.name} · Portfolio`,
    title: `${profile.name} · Software Engineer`,
    description:
      "Walk through a 3D night-time Brisbane campus built from my resume.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: `${profile.name} · Software Engineer`,
    description:
      "Walk through a 3D night-time Brisbane campus built from my resume.",
  },
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": `${siteUrl}/rss.xml` },
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#070b14",
  width: "device-width",
  initialScale: 1,
};

const beaconToken = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${pressStart.variable}`}>
      <body className="antialiased">
        {children}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: jsonLdString(personJsonLd()) }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: jsonLdString(webSiteJsonLd()) }}
        />
        {beaconToken && (
          <Script
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token": "${beaconToken}"}`}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
