import { NextResponse } from 'next/server'

const BACKEND = process.env.API_URL!

// 月曆小工具用的整月班表 JSON（?month=YYYY-MM，沒給就是這個月），靠網址裡的
// calendar token 驗證，不需要登入 session。
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[\w-]{16,64}$/.test(token)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const month = new URL(req.url).searchParams.get('month')
  const qs = month && /^\d{4}-\d{2}$/.test(month) ? `?month=${month}` : ''
  const res = await fetch(`${BACKEND}/calendar/feed/${token}/month${qs}`, { cache: 'no-store' })
  if (!res.ok) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(await res.json(), { headers: { 'Cache-Control': 'no-cache' } })
}
