import { NextResponse } from 'next/server'

const BACKEND = process.env.API_URL!

// Siri 語音記帳的一問一答（見後端 routers/voice.py）：第一次送 {text}，之後送 {session, answer}，
// 每次回 {status, say, choices, session}。靠網址裡的記帳 token 驗證。
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[\w-]{16,64}$/.test(token)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const res = await fetch(`${BACKEND}/auto-record/feed/${token}/voice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: await req.text(),
    cache: 'no-store',
  })
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status })
}
