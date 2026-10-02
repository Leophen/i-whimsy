import type { MetadataRoute } from 'next';

import { CATEGORIES, TOOLS } from '@/config/tools';
import { siteConfig } from '@/config/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/tools`, lastModified, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${base}/about`, lastModified, changeFrequency: 'monthly', priority: 0.4 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = CATEGORIES.map((c) => ({
    url: `${base}/categories/${c.id}`,
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const toolRoutes: MetadataRoute.Sitemap = TOOLS.map((t) => ({
    url: `${base}/tools/${t.slug}`,
    lastModified,
    changeFrequency: 'monthly' as const,
    priority: t.featured ? 0.9 : 0.75,
  }));

  return [...staticRoutes, ...categoryRoutes, ...toolRoutes];
}
