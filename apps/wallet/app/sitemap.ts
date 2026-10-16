import type { MetadataRoute } from 'next'
import { MARKETING_PAGES, SITE } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE.url, changeFrequency: 'weekly', priority: 1 },
    ...MARKETING_PAGES.map(p => ({ url: `${SITE.url}${p.href}`, changeFrequency: 'monthly' as const, priority: 0.8 })),
    { url: `${SITE.url}/register`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE.url}/login`, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
