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
