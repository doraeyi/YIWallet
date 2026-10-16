import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/site'

// 只讓搜尋引擎收錄介紹網站；App 裡面的頁面要登入才看得到，收了也沒意義
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/', '/dashboard', '/transactions', '/stats', '/cashflow', '/recap', '/statements',
        '/schedule', '/friends', '/settings', '/bank-notify', '/admin', '/offline',
      ],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  }
}
