import { fetchTaiwanHolidays } from '@/lib/taiwan-holidays'

const BACKEND = process.env.API_URL!

// Android 桌面「月曆」小工具用的網頁：一次看整個月哪幾天有班，版面跟 iPhone
// Scriptable 的月曆腳本一致。日期顏色比照 iPhone 內建行事曆：週日和國定假日紅字、
// 週六藍字。顏色跟著系統深淺色；?bg=transparent 拿掉底色。
// 跟其他 /api/calendar/<token>/* 一樣靠網址裡的 calendar token 驗證。

interface MonthShift {
  date: string
  start: string
  end: string
  label: string | null
  job: string | null
  color: string | null
}

interface MonthData {
  today: string
  month: string
  shifts: MonthShift[]
  total_hours: number
  holidays: { date: string; name: string }[]
}

const WEEK = ['日', '一', '二', '三', '四', '五', '六']

function esc(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function safeColor(c: string | null): string {
  return c && /^#[0-9a-fA-F]{6}$/.test(c) ? c : '#f59e0b'
}

// 格子裡的小標籤：有班別名稱就取第一個字（早／晚／跨），沒有就顯示上班的小時數
function chip(s: MonthShift): string {
  return s.label ? s.label.slice(0, 1) : String(Number(s.start.slice(0, 2)))
}

function render(data: MonthData | null, transparent: boolean, scheduleUrl: string): string {
  let inner: string
  if (!data) {
    inner = '<p class="err">讀取失敗，稍後再試</p>'
  } else {
    const [y, m] = data.month.split('-').map(Number)
    const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay()
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
    const byDate = new Map<string, MonthShift[]>()
    for (const s of data.shifts) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s])
    const holidays = new Map(data.holidays.map(h => [h.date, h.name]))

    const cells: string[] = []
    for (let i = 0; i < firstDow; i++) cells.push('<div class="c"></div>')
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${data.month}-${String(d).padStart(2, '0')}`
      const dow = (firstDow + d - 1) % 7
      const tone = dow === 0 || holidays.has(iso) ? 'red' : dow === 6 ? 'sat' : ''
      const cls = ['c', iso === data.today ? 'today' : '', iso < data.today ? 'past' : '', tone].filter(Boolean).join(' ')
      const title = holidays.get(iso)
      const chips = (byDate.get(iso) ?? []).slice(0, 2).map(s =>
        `<span class="chip" style="--c:${safeColor(s.color)}">${esc(chip(s))}</span>`).join('')
      cells.push(`<div class="${cls}"${title ? ` title="${esc(title)}"` : ''}><span class="n">${d}</span>${chips}</div>`)
    }
    while (cells.length % 7) cells.push('<div class="c"></div>')
    const weeks = cells.length / 7

    inner = `
      <div class="head">
        <span class="title">${m}月</span>
        <span class="sum">${data.shifts.length} 班 · ${data.total_hours} 小時</span>
      </div>
      <div class="wd">${WEEK.map((w, i) => `<span class="${i === 0 ? 'red' : i === 6 ? 'sat' : ''}">${w}</span>`).join('')}</div>
      <div class="grid" style="grid-template-rows: repeat(${weeks}, 1fr)">${cells.join('')}</div>`
  }

  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta http-equiv="refresh" content="1800">
<title>班表月曆</title>
<style>
  :root { --bg: #ffffff; --text: #111827; --sub: #6b7280; --accent: #d97706; --on-accent: #ffffff; --chip-a: 22%; --red: #dc2626; --sat: #2563eb; }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #1c1c1e; --text: #f5f5f7; --sub: #a1a1aa; --accent: #fbbf24; --on-accent: #1c1c1e; --chip-a: 38%; --red: #f87171; --sat: #60a5fa; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; background: ${transparent ? 'transparent' : 'var(--bg)'}; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
    color: var(--text); -webkit-font-smoothing: antialiased;
  }
  a.card {
    display: flex; flex-direction: column; height: 100%; padding: 12px 12px 10px;
    color: inherit; text-decoration: none; overflow: hidden;
    ${transparent ? '' : 'border-radius: 22px; background: var(--bg);'}
  }
  .head { display: flex; justify-content: space-between; align-items: baseline; padding: 0 4px 6px; }
  .title { font-size: 16px; font-weight: 700; color: var(--accent); }
  .sum { font-size: 11px; color: var(--sub); }
  .wd, .grid { display: grid; grid-template-columns: repeat(7, 1fr); }
  .wd span { text-align: center; font-size: 10px; color: var(--sub); padding-bottom: 3px; }
  .wd .red { color: var(--red); }
  .wd .sat { color: var(--sat); }
  .grid { flex: 1; min-height: 0; }
  .c { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 2px; padding-top: 2px; min-height: 0; overflow: hidden; }
  .n {
    width: 20px; height: 20px; line-height: 20px; text-align: center; border-radius: 50%;
    font-size: 12px; font-weight: 500; font-variant-numeric: tabular-nums;
  }
  .red .n { color: var(--red); }
  .sat .n { color: var(--sat); }
  .past { opacity: .4; }
  .today .n { background: var(--accent); color: var(--on-accent); font-weight: 700; }
  .chip {
    font-size: 10px; font-weight: 700; line-height: 1; padding: 2px 5px; border-radius: 5px;
    color: var(--c); background: color-mix(in srgb, var(--c) var(--chip-a), transparent);
  }
  @media (prefers-color-scheme: dark) { .chip { color: color-mix(in srgb, var(--c) 55%, white); } }
  .err { color: var(--sub); font-size: 13px; padding: 4px; }
</style>
</head>
<body>
<a class="card" href="${esc(scheduleUrl)}" target="_top">${inner}</a>
</body>
</html>`
}

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[\w-]{16,64}$/.test(token)) {
    return new Response('Not found', { status: 404 })
  }
  const url = new URL(req.url)
  const transparent = url.searchParams.get('bg') === 'transparent'
  const month = url.searchParams.get('month')
  const qs = month && /^\d{4}-\d{2}$/.test(month) ? `?month=${month}` : ''

  let data: MonthData | null = null
  try {
    const res = await fetch(`${BACKEND}/calendar/feed/${token}/month${qs}`, { cache: 'no-store' })
    if (res.status === 404) return new Response('Not found', { status: 404 })
    if (res.ok) {
      const json = await res.json()
      const holidays = (await fetchTaiwanHolidays(Number(json.month.slice(0, 4)))).filter(h => h.date.startsWith(json.month))
      data = { ...json, holidays }
    }
  } catch {
    data = null
  }

  return new Response(render(data, transparent, `${url.origin}/schedule`), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
  })
}
