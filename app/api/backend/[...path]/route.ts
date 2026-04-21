import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

const BACKEND = process.env.API_URL!

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
  const backendUrl = `${BACKEND}/${path.join('/')}${url.search}`

  const headers = new Headers()
  headers.set('Authorization', `Bearer ${session.token}`)
  const contentType = req.headers.get('Content-Type')
  if (contentType) headers.set('Content-Type', contentType)

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
  const res = await fetch(backendUrl, {
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

export const GET    = handler
export const POST   = handler
export const PUT    = handler
export const PATCH  = handler
export const DELETE = handler
