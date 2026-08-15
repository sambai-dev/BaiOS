import "@/app/styles/global.css";
import "@/app/styles/workbench-os.css";
import "@/app/styles/workbench-menu-bar.css";
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
});

const azeretMono = Azeret_Mono({
  subsets: ["latin"],
  variable: "--font-data",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.sambai.dev"),
  alternates: { canonical: "/" },
  title: "Sam Bai — Founder, Solynth Labs",
  description:
    "Sam Bai is the founder of Solynth Labs, a New Zealand software consultation and production company.",
  keywords: [
    "Sam Bai",
    "Solynth Labs",
    "software consultation New Zealand",
    "design engineering",
    "software production",
    "AI workflows",
  ],
  authors: [{ name: "Sam Bai" }],
  openGraph: {
    type: "website",
    url: "https://www.sambai.dev",
    title: "Sam Bai — Founder, Solynth Labs",
    description:
      "Software consultation, design engineering, and production from New Zealand.",
    siteName: "Sam Bai",
    locale: "en_NZ",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sam Bai — Founder, Solynth Labs",
    description:
      "Software consultation, design engineering, and production from New Zealand.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#11110f",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Sam Bai",
  jobTitle: "Founder and Software Consultant",
  url: "https://www.sambai.dev",
  email: "sambai.codes@gmail.com",
  worksFor: {
    "@type": "Organization",
    name: "Solynth Labs Limited",
    url: "https://solynthlabs.com",
  },
  sameAs: [
    "https://github.com/sambai-dev",
    "https://www.linkedin.com/in/sam-bai-dev/",
  ],
  address: {
    "@type": "PostalAddress",
    addressLocality: "Hamilton",
    addressCountry: "New Zealand",
  },
};

const designContract = `<!--
THESIS: A precise public front door says what Sam is building and refuses the project-card résumé.
OWN-WORLD: Carbon grain, ivory condensed type, cobalt operational light, square rules, and a live Workbench console.
STORY: Meet Sam, understand Solynth, visit the company, enter the Workbench, or make contact.
FIRST VIEWPORT: Identity sits top-left, a live aperture top-right, the statement owns the field, and useful links anchor the bottom.
FORM: Quiet Junction, grounded direction 3, seed 18eae09c.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
