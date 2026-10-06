import { APP_VERSION, BUILD_ID } from '@/lib/version'

export const dynamic = 'force-dynamic'

export async function GET() {
  // 快取名稱帶部署編號：每次部署 sw.js 內容就不同，瀏覽器才會裝新的 service worker
  const CACHE_NAME = `yiwallet-${APP_VERSION}-${BUILD_ID}`

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  }

  // Only wire up FCM once the project has real Firebase credentials configured
  const pushSection = firebaseConfig.apiKey ? `
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

firebase.initializeApp(${JSON.stringify(firebaseConfig)})
const messaging = firebase.messaging()

// App 在背景（分頁未開啟/未聚焦）時顯示系統通知
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {}
  self.registration.showNotification(title || '易記帳', {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: payload.data,
  })
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((list) => {
      const existing = list.find((c) => c.url.includes(url))
      if (existing) return existing.focus()
      return self.clients.openWindow(url)
    })
  )
})
` : ''

  const sw = `
${pushSection}
const CACHE_NAME = '${CACHE_NAME}'

// Pre-cache offline fallback; do NOT skipWaiting — new SW stays waiting until user approves
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add('/offline'))
  )
})

self.addEventListener('activate', (event) => {
  // Delete caches from previous versions, then claim all clients
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// User clicked "立即更新" in the banner
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  if (!event.request.url.startsWith(self.location.origin)) return

  const url = new URL(event.request.url)

  // /_next/static/ assets are content-addressed (immutable) — always cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request)
        if (cached) return cached
        const response = await fetch(event.request)
        if (response.ok) cache.put(event.request, response.clone())
        return response
      })
    )
    return
  }

  // Navigation (HTML pages) — cache-first：使用者按「更新」之前一直看到同一版。
  // 以前會在背景把新版頁面寫進舊快取，結果有時新有時舊，現在只有快取裡沒有才去拿
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request)
        if (cached) return cached
        try {
          const response = await fetch(event.request)
          if (response.ok) cache.put(event.request, response.clone())
          return response
        } catch {
          return (await caches.match('/offline')) ?? Response.error()
        }
      })
    )
    return
  }

  // Everything else — network with cache fallback
  event.respondWith(
    caches.match(event.request).then(
      (cached) => cached ?? fetch(event.request).catch(() => caches.match('/offline'))
    )
  )
})
`

  return new Response(sw, {
    headers: {
      'Content-Type': 'application/javascript',
      'Service-Worker-Allowed': '/',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
