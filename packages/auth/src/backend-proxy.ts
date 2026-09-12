import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from './session'

// 建立轉發到 FastAPI 後端的 catch-all proxy handler：驗證 session cookie、
// 換成 Authorization bearer header 後轉發，瀏覽器端完全不會碰到後端網址或 token。
// wallet、sop 兩個 app 各自的 app/api/backend/[...path]/route.ts 都用這個 factory。
export function createBackendProxyHandlers(backendUrl: string) {
  async function handler(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> },
  ) {
    const session = await verifySession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { path } = await params
    const url = new URL(req.url)
    const backendRequestUrl = `${backendUrl}/${path.join('/')}${url.search}`

    const headers = new Headers()
    headers.set('Authorization', `Bearer ${session.token}`)
    const contentType = req.headers.get('Content-Type')
    if (contentType) headers.set('Content-Type', contentType)

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
    const res = await fetch(backendRequestUrl, {
      method: req.method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
    })

    const body = res.status === 204 ? null : await res.arrayBuffer()
    return new NextResponse(body, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
    })
  }

  return { GET: handler, POST: handler, PUT: handler, PATCH: handler, DELETE: handler }
}
