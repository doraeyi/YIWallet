import { NextResponse } from 'next/server'

const BACKEND = process.env.API_URL!

// 手機桌面小工具（Scriptable 等）用的近期班表 JSON，跟 .ics 一樣靠網址裡的
// calendar token 驗證，不需要登入 session。
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[\w-]{16,64}$/.test(token)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const days = new URL(req.url).searchParams.get('days') ?? '7'
  const res = await fetch(`${BACKEND}/calendar/feed/${token}/upcoming?days=${encodeURIComponent(days)}`, { cache: 'no-store' })
  if (!res.ok) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(await res.json(), { headers: { 'Cache-Control': 'no-cache' } })
}
