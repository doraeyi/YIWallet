const BACKEND = process.env.API_URL!

// Android 桌面小工具用的精簡班表網頁：給「網頁小工具」類 App 直接嵌在桌面上。
// 版面跟 iPhone 的 Scriptable 小工具一致（上面大字下一班、下面列之後幾班），
// 顏色跟著系統深淺色（prefers-color-scheme）。
// 加 ?bg=transparent 可以拿掉卡片底色，讓桌布透出來。
// 跟 .ics 一樣靠網址裡的 calendar token 驗證，不需要登入 session。

interface UpcomingShift {
  date: string
  start: string
  end: string
  label: string | null
  job: string | null
  color: string | null
  in_progress: boolean
}

interface Upcoming {
  today: string
  name: string
  shifts: UpcomingShift[]
}

const WEEK = ['日', '一', '二', '三', '四', '五', '六']

function esc(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function parseDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function dayLabel(s: UpcomingShift, today: string): string {
  if (s.in_progress) return '上班中'
  const d = parseDate(s.date)
  const diff = Math.round((d.getTime() - parseDate(today).getTime()) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  if (diff === 2) return '後天'
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}（${WEEK[d.getUTCDay()]}）`
}

function render(data: Upcoming | null, transparent: boolean, scheduleUrl: string): string {
  let body: string
  let dateText = ''
  if (!data) {
    body = '<p class="sub">讀取失敗，稍後再試</p>'
  } else {
    const t = parseDate(data.today)
    dateText = `${t.getUTCMonth() + 1}/${t.getUTCDate()} 週${WEEK[t.getUTCDay()]}`
    if (data.shifts.length === 0) {
      body = '<p class="big">近期沒有班</p><p class="sub">好好休息 ☕</p>'
    } else {
      const [next, ...rest] = data.shifts
      const label = dayLabel(next, data.today)
      const hot = next.in_progress || label === '今天'
      const meta = [next.label, next.job].filter(Boolean).map(x => esc(x!)).join(' · ')
      body = `
        <p class="when${hot ? ' hot' : ''}">${esc(label)}</p>
        <p class="big">${esc(next.start)} – ${esc(next.end)}</p>
        ${meta ? `<p class="sub">${meta}</p>` : ''}
        ${rest.length ? `<ul>${rest.slice(0, 6).map(s => `
          <li><span class="d">${esc(dayLabel(s, data.today))}</span><span class="t">${esc(s.start)}–${esc(s.end)}</span><span class="l">${esc(s.label ?? '')}</span></li>`).join('')}
        </ul>` : ''}`
    }
  }

  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta http-equiv="refresh" content="900">
<title>班表</title>
<style>
  :root {
    --bg: #ffffff; --text: #111827; --sub: #6b7280; --accent: #d97706; --line: #f3f4f6;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #1c1c1e; --text: #f5f5f7; --sub: #a1a1aa; --accent: #fbbf24; --line: #2c2c2e; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; background: ${transparent ? 'transparent' : 'var(--bg)'}; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
    color: var(--text); -webkit-font-smoothing: antialiased;
  }
  a.card {
    display: flex; flex-direction: column; height: 100%; padding: 14px 16px;
    color: inherit; text-decoration: none; overflow: hidden;
    ${transparent ? '' : 'border-radius: 22px; background: var(--bg);'}
  }
  .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .head .title { font-size: 12px; font-weight: 600; color: var(--accent); }
  .head .date { font-size: 11px; color: var(--sub); }
  .when { font-size: 12px; font-weight: 600; color: var(--sub); }
  .when.hot { color: var(--accent); }
  .big { font-size: clamp(16px, 11vw, 30px); font-weight: 700; letter-spacing: -0.02em; line-height: 1.2; white-space: nowrap; }
  .sub { font-size: 12px; color: var(--sub); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ul { list-style: none; margin-top: 8px; border-top: 1px solid var(--line); padding-top: 6px; }
  li { display: flex; align-items: baseline; gap: 8px; font-size: 12px; padding: 2px 0; }
  li .d { width: 76px; flex: none; font-weight: 600; }
  li .t { font-variant-numeric: tabular-nums; }
  li .l { margin-left: auto; color: var(--sub); font-size: 11px; }
  /* 小尺寸小工具只放下一班 */
  @media (max-height: 170px) { ul { display: none; } }
</style>
</head>
<body>
<a class="card" href="${esc(scheduleUrl)}" target="_top">
  <div class="head"><span class="title">班表</span><span class="date">${esc(dateText)}</span></div>
  ${body}
</a>
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

  let data: Upcoming | null = null
  try {
    const res = await fetch(`${BACKEND}/calendar/feed/${token}/upcoming?days=14`, { cache: 'no-store' })
    if (res.status === 404) return new Response('Not found', { status: 404 })
    if (res.ok) data = await res.json()
  } catch {
    data = null
  }

  return new Response(render(data, transparent, `${url.origin}/schedule`), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
  })
}
