import { NextResponse } from 'next/server'

const BACKEND = process.env.API_URL!

// 自動記帳的通用入口：Apple Pay 捷徑（金額／商家／卡片）跟付款通知捷徑（標題／內文）都送這裡，
// 後端看內容判斷是哪一種。舊的 /apple-pay、/notification 網址也還能用。
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[\w-]{16,64}$/.test(token)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const res = await fetch(`${BACKEND}/auto-record/feed/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: await req.text(),
    cache: 'no-store',
  })
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status })
}
