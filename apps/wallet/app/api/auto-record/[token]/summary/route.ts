const BACKEND = process.env.API_URL!

// Siri「我花多少」跟桌面小工具：回一段純文字的本月摘要（見後端 routers/insights.py）。
// ?style=widget 是一行的短版；?q= 帶問句（問「今天」會先講今天）。靠網址裡的記帳 token 驗證。
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const text = (body: string) => new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
  if (!/^[\w-]{16,64}$/.test(token)) return text('記帳網址不對，請到易記帳的設定重新複製')
  const search = new URL(req.url).search
  const res = await fetch(`${BACKEND}/auto-record/feed/${token}/summary${search}`, { cache: 'no-store' }).catch(() => null)
  return text(res?.ok ? await res.text() : '記帳伺服器暫時連不上，等一下再試')
}
