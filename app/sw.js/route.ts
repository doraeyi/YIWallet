import { APP_VERSION } from '@/lib/version'

export const dynamic = 'force-dynamic'

export async function GET() {
  const CACHE_NAME = `yiwallet-${APP_VERSION}`

  const sw = `
const CACHE_NAME = '${CACHE_NAME}'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add('/offline')))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  if (!event.request.url.startsWith(self.location.origin)) return

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/offline'))
    )
    return
  }

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
