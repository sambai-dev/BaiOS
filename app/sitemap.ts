// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { MetadataRoute } from "next";

export const revalidate = 604800;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://www.sambai.dev",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
