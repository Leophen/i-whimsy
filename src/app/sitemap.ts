import type { MetadataRoute } from 'next';

import { TOOLS } from '@/config/tools';
import { siteConfig } from '@/config/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/about`, lastModified, changeFrequency: 'monthly', priority: 0.4 },
  ];

  const toolRoutes: MetadataRoute.Sitemap = TOOLS.map((t) => ({
    url: `${base}/tools/${t.slug}`,
    lastModified,
    changeFrequency: 'monthly' as const,
    priority: t.featured ? 0.9 : 0.75,
  }));

  return [...staticRoutes, ...toolRoutes];
}
