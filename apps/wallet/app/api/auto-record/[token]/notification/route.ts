import { NextResponse } from 'next/server'

const BACKEND = process.env.API_URL!

// iOS 27 捷徑「收到通知」自動化送進來的付款通知（標題＋內文），轉給後端解析後記帳。
// 跟 Apple Pay 一樣靠網址裡的 record token 驗證。
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[\w-]{16,64}$/.test(token)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const res = await fetch(`${BACKEND}/auto-record/feed/${token}/notification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: await req.text(),
    cache: 'no-store',
  })
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status })
}
