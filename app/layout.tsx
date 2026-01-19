import "@/app/styles/global.css";
import type { Metadata, Viewport } from "next";
import { Raleway } from "next/font/google";
import { ThemeProvider } from "./components/ThemeProvider";
import SmoothScroll from "./components/SmoothScroll";

// Raleway font - clean, modern look for portfolios
const raleway = Raleway({ subsets: ["latin"] });

// SEO metadata - update with your information
export const metadata: Metadata = {
  metadataBase: new URL("https://www.sambai.dev"),
  alternates: {
    canonical: "/",
  },
  title: {
    template: "Sam Bai - %s",
    default:
      "Sam Bai | Full-Stack Developer | Next.js, TypeScript, React | Hamilton, NZ",
  },
  description:
    "Graduate full-stack developer seeking junior roles at NZ startups. Built 3 production SaaS apps with Next.js, TypeScript, and Supabase. View my portfolio.",
  keywords: [
    "Full Stack Developer New Zealand",
    "Junior Developer Hamilton NZ",
    "React Developer New Zealand",
    "Next.js Developer for hire",
    "TypeScript Developer portfolio",
    "Graduate Developer NZ startups",
    "Full Stack Developer Supabase",
    "Web Developer Hamilton Waikato",
    "NZ startup developer",
    "Junior Full Stack role New Zealand",
  ],
  authors: [{ name: "Sam Bai" }],
  openGraph: {
    type: "website",
    url: "https://www.sambai.dev",
    title: "Sam Bai | Full-Stack Developer",
    description:
      "Graduate full-stack developer seeking junior roles at NZ startups. Built 3 production SaaS apps with Next.js, TypeScript, and Supabase.",
    siteName: "Sam Bai Portfolio",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Sam Bai - Full-Stack Developer Portfolio",
      },
    ],
    locale: "en_NZ",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Sam Bai",
  jobTitle: "Full-Stack Developer",
  url: "https://www.sambai.dev",
  email: "sambai.codes@gmail.com",
  knowsAbout: [
    "React",
    "Next.js",
    "TypeScript",
    "Node.js",
    "PostgreSQL",
    "Supabase",
  ],
  alumniOf: {
    "@type": "CollegeOrUniversity",
    name: "Wintec",
  },
  sameAs: [
    "https://github.com/sambai-dev",
    "https://www.linkedin.com/in/sam-bai-dev/",
  ],
  address: {
    "@type": "PostalAddress",
    addressLocality: "Hamilton",
    addressRegion: "Waikato",
    addressCountry: "New Zealand",
  },
  hasCredential: [
    {
      "@type": "EducationalOccupationalCredential",
      name: "Google AI Essentials",
    },
    {
      "@type": "EducationalOccupationalCredential",
      name: "IBM Full Stack Software Developer Professional Certificate",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${raleway.className} antialiased bg-dark-100 text-stone-200`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <SmoothScroll>{children}</SmoothScroll>
        </ThemeProvider>
      </body>
    </html>
  );
}
