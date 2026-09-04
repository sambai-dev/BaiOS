// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import "@/app/styles/global.css";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

const archivo = localFont({
  src: "./fonts/archivo-latin.woff2",
  variable: "--font-body",
  weight: "100 900",
  display: "swap",
});

const azeretMono = localFont({
  src: "./fonts/azeret-mono-latin.woff2",
  variable: "--font-data",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.sambai.dev"),
  alternates: { canonical: "https://www.sambai.dev/" },
  title: "Sam Bai | Founder & Product Engineer, Solynth Labs",
  description:
    "Sam Bai is founder and product engineer at Solynth Labs, designing and building web products, developer tools, and production software in New Zealand.",
  authors: [{ name: "Sam Bai" }],
  openGraph: {
    type: "website",
    url: "https://www.sambai.dev/",
    title: "Sam Bai | Founder & Product Engineer, Solynth Labs",
    description:
      "Sam Bai is founder and product engineer at Solynth Labs, designing and building web products, developer tools, and production software in New Zealand.",
    siteName: "Sam Bai",
    locale: "en_NZ",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sam Bai | Founder & Product Engineer, Solynth Labs",
    description:
      "Sam Bai is founder and product engineer at Solynth Labs, designing and building web products, developer tools, and production software in New Zealand.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#11110f",
  viewportFit: "cover",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Sam Bai",
  jobTitle: "Founder & Product Engineer",
  url: "https://www.sambai.dev/",
  email: "sambai.codes@gmail.com",
  worksFor: {
    "@type": "Organization",
    name: "Solynth Labs Limited",
    url: "https://solynthlabs.com",
  },
  sameAs: [
    "https://github.com/sambai-dev",
    "https://www.linkedin.com/in/sam-bai1/",
  ],
  address: {
    "@type": "PostalAddress",
    addressLocality: "Hamilton",
    addressCountry: "New Zealand",
  },
};

const jsonLdString = JSON.stringify(jsonLd)
  .replace(/</g, "\\u003c")
  .replace(/>/g, "\\u003e")
  .replace(/&/g, "\\u0026");

const designContract = `<!--
THESIS: Sam designs and builds software. The public front door states that plainly; the Workbench supplies the evidence.
OWN-WORLD: Carbon grain, ivory Archivo type, a quiet route-tinted desktop, square rules, and readable working tools.
STORY: Meet Sam, understand Solynth, visit the company, enter the Workbench, or make contact.
FIRST VIEWPORT: Readable identity above, a three-line statement beside a visible Workbench entrance, and useful links below.
FORM: Quiet Junction, grounded direction 3, seed 18eae09c.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${archivo.variable} ${azeretMono.variable}`}
      >
        <template dangerouslySetInnerHTML={{ __html: designContract }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdString }}
        />
        {children}
      </body>
    </html>
  );
}
