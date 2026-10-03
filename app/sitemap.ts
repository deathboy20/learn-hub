import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl()
  const now = new Date()
  const publicPaths = [
    '',
    '/about',
    '/contact',
    '/courses',
    '/programmes',
    '/faq',
    '/privacy',
    '/terms',
    '/login',
    '/register',
  ]

  return publicPaths.map(path => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.7,
  }))
}
