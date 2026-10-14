import { NextResponse } from 'next/server'

const BACKEND = process.env.API_URL!

// 自動記帳的通用入口：iPhone 捷徑（Apple Pay 的金額／商家／卡片、付款通知的標題／內文）
// 和 Android 的 MacroDroid 都送這裡，後端看內容判斷是哪一種。舊的 /apple-pay、/notification 也還能用。
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[\w-]{16,64}$/.test(token)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const payload = await readPayload(req)
  const res = await fetch(`${BACKEND}/auto-record/feed/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status })
}

// 各種自動化 App 送資料的方式不一樣，這裡全部收成一個物件：
// - 標準 JSON（iPhone 捷徑）
// - MacroDroid 這類「把通知原文直接塞進 JSON 範本」的：通知裡有換行就變成不合法的 JSON，
//   把字串裡的換行轉成 \n 再解析一次
// - 表單格式（application/x-www-form-urlencoded）
// - 網址參數（?title=...&text=...），跟上面任何一種合併
async function readPayload(req: Request): Promise<Record<string, unknown>> {
  const fromQuery = Object.fromEntries(new URL(req.url).searchParams)
  const raw = await req.text()
  if (!raw.trim()) return fromQuery

  const contentType = req.headers.get('content-type') ?? ''
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return { ...fromQuery, ...Object.fromEntries(new URLSearchParams(raw)) }
  }
  for (const candidate of [raw, raw.replace(/\r?\n/g, '\\n')]) {
    try {
      const parsed = JSON.parse(candidate)
      if (parsed && typeof parsed === 'object') return { ...fromQuery, ...parsed }
    } catch {}
  }
  // 都不是：整段當成通知內文
  return { ...fromQuery, text: raw }
}
