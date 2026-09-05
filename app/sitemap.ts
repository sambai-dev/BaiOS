// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { MetadataRoute } from "next";
import { caseStudies } from "@/app/lib/project-case-studies";

export const revalidate = 604800;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      // Trailing slash matches the resolved canonical URL in layout.tsx so
      // crawlers see one URL variant, not two.
      url: "https://www.sambai.dev/",
      // No lastModified: a regenerated-but-unchanged page must not claim
      // fresh modification on every weekly revalidation.
      changeFrequency: "weekly",
      priority: 1,
    },
    ...caseStudies.map(({ slug }) => ({
      url: `https://www.sambai.dev/work/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
