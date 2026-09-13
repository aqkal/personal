import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, Press_Start_2P } from "next/font/google";
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

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${profile.name} · Software Engineer`,
    template: `%s · ${profile.name}`,
  },
  description:
    "An explorable 3D Brisbane campus and a spotlight portfolio, both built from my resume. Walk through my experience, projects, and skills.",
  openGraph: {
    type: "website",
    siteName: `${profile.name} · Portfolio`,
    title: `${profile.name} · Software Engineer`,
    description:
      "Walk through a sunny 3D Brisbane campus built from my resume.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: `${profile.name} · Software Engineer`,
    description:
      "Walk through a sunny 3D Brisbane campus built from my resume.",
  },
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": `${siteUrl}/rss.xml` },
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#faf7f0",
  width: "device-width",
  initialScale: 1,
};

const beaconToken = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${pressStart.variable} ${bricolage.variable}`}
    >
      <body className="antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){var t="light";try{var s=localStorage.getItem("theme");if(s==="light"||s==="dark")t=s}catch(e){}document.documentElement.dataset.theme=t})()',
          }}
        />
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdString(personJsonLd()) }}
        />
        <script
          type="application/ld+json"
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
