// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import "@/app/styles/global.css";
import type { Metadata, Viewport } from "next";
import { Archivo, Archivo_Black, Azeret_Mono } from "next/font/google";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-body",
});

const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  preload: true,
});

const azeretMono = Azeret_Mono({
  subsets: ["latin"],
  variable: "--font-data",
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
THESIS: Sam designs and builds software. A minimal personal introduction with direct contact and Workbench access.
OWN-WORLD: A quiet personal portfolio with carbon and ivory surfaces, Archivo typography, restrained cobalt, and generous space.
STORY: Meet Sam, find contact and résumé links, or open Workbench to explore.
FIRST VIEWPORT: Identity, one large headline, coordinates, compact Workbench access, and a simple footer.
FORM: The original typography-led homepage with Site, Direct, and Elsewhere link groups; the computer lab lives inside Workbench.
FINISH: Verify project and contact links, keyboard and touch interaction, responsive layout, and production performance.
-->`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${archivo.variable} ${archivoBlack.variable} ${azeretMono.variable}`}
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
