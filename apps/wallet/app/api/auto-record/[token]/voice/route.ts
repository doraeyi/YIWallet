import { NextResponse } from 'next/server'

const BACKEND = process.env.API_URL!

// Siri 語音記帳的一問一答（見後端 routers/voice.py）：每次都送 {text}，回一句純文字，
// 以「？」結尾就是還在問。靠網址裡的記帳 token 驗證。
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
  // 捷徑會把回的字直接念出來，所以連出錯也回一句話（狀態碼保持 200，捷徑才不會跳錯誤）
  const say = res.ok ? await res.text() : '記帳伺服器暫時連不上，等一下再試'
  return new Response(say, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
