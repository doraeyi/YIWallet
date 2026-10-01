import { NextResponse } from 'next/server'
import { fetchTaiwanHolidays } from '@/lib/taiwan-holidays'

const BACKEND = process.env.API_URL!

// 月曆小工具用的整月班表 JSON（?month=YYYY-MM，沒給就是這個月），順便附上
// 這個月的國定假日讓小工具標紅字。靠網址裡的 calendar token 驗證，不需要登入 session。
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
  const data = await res.json()
  const holidays = (await fetchTaiwanHolidays(Number(data.month.slice(0, 4))))
    .filter(h => h.date.startsWith(data.month))
  return NextResponse.json({ ...data, holidays }, { headers: { 'Cache-Control': 'no-cache' } })
}
