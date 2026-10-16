import type { Metadata } from 'next'

// 對外介紹網站的共用設定：名稱、網址、說明、公開頁面清單。
// 要改名、改標語只改這裡，標題、分享預覽、結構化資料、sitemap 都會跟著變。

export const SITE = {
  name: '易記帳',
  englishName: 'YiWallet',
  fullName: '易記帳 YiWallet',
  url: 'https://yiwallet.doraeyi.com',
  tagline: '付完錢，帳就記好了。',
  description:
    '易記帳 YiWallet 是不用下載的記帳 App：Apple Pay、LINE Pay 付完款自動記帳，信用卡帳單、預算、現金流、班表薪水一起管。iPhone、Android、電腦都能用，目前免費。',
} as const

// 不用登入就能看的介紹頁（proxy 放行、sitemap 列出、導覽列顯示）
export const MARKETING_PAGES = [
  { href: '/features', label: '功能介紹' },
  { href: '/auto-record', label: '自動記帳' },
  { href: '/security', label: '資料安全' },
  { href: '/install', label: '安裝到手機' },
  { href: '/faq', label: '常見問題' },
] as const

export const PUBLIC_PATHS = ['/', ...MARKETING_PAGES.map(p => p.href)]

// 介紹頁的 metadata：標題、說明、網址同時套到搜尋結果和 LINE／FB 分享預覽上
export function pageMeta(title: string, description: string, path: string, absoluteTitle = false): Metadata {
  const full = absoluteTitle ? title : `${title}｜${SITE.fullName}`
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { title: full, description, url: path, siteName: SITE.fullName, locale: 'zh_TW', type: 'website' },
  }
}
