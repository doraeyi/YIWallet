import { NextResponse } from 'next/server'

const BACKEND = process.env.API_URL!

// 班表行事曆訂閱（.ics）：手機行事曆 App 不會帶登入 cookie，所以不驗 session，
// 改由網址裡每個人自己的 calendar token 當通行證，後端驗。
// 網址長這樣：/api/calendar/<token>.ics
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const bare = token.replace(/\.ics$/, '')
  if (!/^[\w-]{16,64}$/.test(bare)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const res = await fetch(`${BACKEND}/calendar/feed/${bare}.ics`, { cache: 'no-store' })
  if (!res.ok) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return new NextResponse(await res.arrayBuffer(), {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="yiwallet-shifts.ics"',
      'Cache-Control': 'no-cache',
    },
  })
}
