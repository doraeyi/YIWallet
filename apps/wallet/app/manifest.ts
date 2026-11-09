import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '易記帳',
    short_name: '易記帳',
    description: '簡單好用的個人記帳 App',
    start_url: '/dashboard',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f7f2e8',
    theme_color: '#f7f2e8',
    categories: ['finance', 'productivity'],
    // 長按桌面圖示（Android）會出現的捷徑選單：最常做的兩件事放最前面，直接打開記帳／數錢包
    shortcuts: [
      { name: '記一筆', short_name: '記一筆', url: '/dashboard?add=1', icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }] },
      { name: '數錢包', short_name: '數錢包', url: '/dashboard?count=1', icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }] },
      { name: '班表', short_name: '班表', url: '/schedule', icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }] },
    ],
    icons: [
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }
}
