import { NextResponse } from 'next/server'

const BACKEND = process.env.API_URL!

// iPhone 捷徑「錢包」自動化送進來的 Apple Pay 交易，靠網址裡的 record token
// 驗證（捷徑帶不了登入 session），轉給後端建立支出。
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[\w-]{16,64}$/.test(token)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const res = await fetch(`${BACKEND}/auto-record/feed/${token}/apple-pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: await req.text(),
    cache: 'no-store',
  })
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status })
}
