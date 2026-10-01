'use client'

import { useEffect, useState } from 'react'
import { CalendarDaysIcon, CheckIcon, ChevronDownIcon, CopyIcon, RefreshCwIcon } from 'lucide-react'
import * as api from '@/lib/api'
import { cn } from '@/lib/utils'

// iPhone 的 Scriptable App 小工具腳本：叫 /api/calendar/<token>/upcoming 拿近期班表。
// 版面跟 Android 用的 /api/calendar/<token>/widget 網頁一致：上面大字顯示下一班，
// 下面列之後幾班；顏色用 Color.dynamic 跟著系統深淺色切換。
// token 直接寫死在腳本裡，重新產生網址後要重貼一次。
function buildScriptableScript(upcomingUrl: string, scheduleUrl: string): string {
  return `// YiWallet 班表小工具（Scriptable）
const API = ${JSON.stringify(upcomingUrl)}
const OPEN = ${JSON.stringify(scheduleUrl)}
const WEEK = ['日', '一', '二', '三', '四', '五', '六']
const dyn = (l, d) => Color.dynamic(new Color(l), new Color(d))
const BG = dyn('#FFFFFF', '#1C1C1E')
const TEXT = dyn('#111827', '#F5F5F7')
const SUB = dyn('#6B7280', '#A1A1AA')
const ACCENT = dyn('#D97706', '#FBBF24')
const LINE = dyn('#F3F4F6', '#2C2C2E')

function ymd(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}
function dayLabel(s, today) {
  if (s.in_progress) return '上班中'
  const d = new Date(s.date + 'T00:00:00')
  const t = new Date(today + 'T00:00:00')
  const diff = Math.round((d - t) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  if (diff === 2) return '後天'
  return (d.getMonth() + 1) + '/' + d.getDate() + '（' + WEEK[d.getDay()] + '）'
}
function text(stack, str, font, color) {
  const t = stack.addText(str)
  t.font = font
  t.textColor = color
  t.lineLimit = 1
  t.minimumScaleFactor = 0.7
  return t
}

let data = null
try { data = await new Request(API).loadJSON() } catch (e) {}

const family = config.widgetFamily || 'medium'
const w = new ListWidget()
w.backgroundColor = BG
w.setPadding(14, 16, 14, 16)
w.url = OPEN

const head = w.addStack()
head.centerAlignContent()
text(head, '班表', Font.semiboldSystemFont(12), ACCENT)
head.addSpacer()
if (data && data.today) {
  const t = new Date(data.today + 'T00:00:00')
  text(head, (t.getMonth() + 1) + '/' + t.getDate() + ' 週' + WEEK[t.getDay()], Font.systemFont(11), SUB)
}
w.addSpacer(8)

if (!data || !data.shifts) {
  text(w, '讀取失敗', Font.systemFont(13), SUB)
} else if (data.shifts.length === 0) {
  text(w, '近期沒有班', Font.boldSystemFont(18), TEXT)
  w.addSpacer(2)
  text(w, '好好休息 ☕', Font.systemFont(12), SUB)
} else {
  const [next, ...rest] = data.shifts
  text(w, dayLabel(next, data.today), Font.semiboldSystemFont(12), next.in_progress || dayLabel(next, data.today) === '今天' ? ACCENT : SUB)
  w.addSpacer(1)
  text(w, next.start + ' – ' + next.end, Font.boldSystemFont(family === 'small' ? 22 : 26), TEXT)
  const meta = [next.label, next.job].filter(Boolean).join(' · ')
  if (meta) { w.addSpacer(1); text(w, meta, Font.systemFont(12), SUB) }

  const max = family === 'small' ? 0 : family === 'large' ? 8 : 2
  if (max > 0 && rest.length > 0) {
    w.addSpacer(8)
    for (const s of rest.slice(0, max)) {
      const row = w.addStack()
      row.centerAlignContent()
      const day = row.addStack()
      day.size = new Size(76, 0)
      text(day, dayLabel(s, data.today), Font.semiboldSystemFont(12), TEXT)
      text(row, s.start + '–' + s.end, Font.systemFont(12), TEXT)
      row.addSpacer()
      if (s.label) text(row, s.label, Font.systemFont(11), SUB)
      w.addSpacer(4)
    }
  }
}

w.addSpacer()
w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000)
Script.setWidget(w)
if (!config.runsInWidget) await w.presentMedium()
Script.complete()
`
}

// iPhone 的 Scriptable「月曆」小工具：叫 /api/calendar/<token>/month 拿整月班表，
// 排成 7 欄月曆，有班的日子下面放班別小標籤（早／晚／跨，或上班小時）。
// 日期顏色比照 iPhone 內建行事曆：週日和國定假日紅字、週六藍字。
// 大尺寸顯示整個月；中尺寸放不下就只顯示本週＋下週。版面跟 Android 的
// /api/calendar/<token>/month-widget 一致。
function buildScriptableMonthScript(monthUrl: string, scheduleUrl: string): string {
  return `// YiWallet 班表月曆小工具（Scriptable）— 建議用「大」尺寸
const API = ${JSON.stringify(monthUrl)}
const OPEN = ${JSON.stringify(scheduleUrl)}
const WEEK = ['日', '一', '二', '三', '四', '五', '六']
const dyn = (l, d) => Color.dynamic(new Color(l), new Color(d))
const BG = dyn('#FFFFFF', '#1C1C1E')
const TEXT = dyn('#111827', '#F5F5F7')
const SUB = dyn('#6B7280', '#A1A1AA')
const ACCENT = dyn('#D97706', '#FBBF24')
const ON_ACCENT = dyn('#FFFFFF', '#1C1C1E')
const RED = dyn('#DC2626', '#F87171')
const SAT = dyn('#2563EB', '#60A5FA')

function hex(c) { return /^#[0-9a-fA-F]{6}$/.test(c || '') ? c : '#F59E0B' }
function chipText(s) { return s.label ? s.label.slice(0, 1) : String(Number(s.start.slice(0, 2))) }
function ymd(y, m, d) { return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0') }
function centered(parent, build) {
  const row = parent.addStack()
  row.addSpacer()
  build(row)
  row.addSpacer()
}

let data = null
try { data = await new Request(API).loadJSON() } catch (e) {}

const family = config.widgetFamily || 'large'
const w = new ListWidget()
w.backgroundColor = BG
w.setPadding(12, 10, 10, 10)
w.url = OPEN

if (!data || !data.month) {
  const t = w.addText('讀取失敗')
  t.textColor = SUB
  t.font = Font.systemFont(13)
} else if (family === 'small') {
  const t = w.addText('月曆請用中或大尺寸')
  t.textColor = SUB
  t.font = Font.systemFont(12)
} else {
  const [y, m] = data.month.split('-').map(Number)
  const firstDow = new Date(y, m - 1, 1).getDay()
  const days = new Date(y, m, 0).getDate()
  const byDate = {}
  for (const s of data.shifts) (byDate[s.date] = byDate[s.date] || []).push(s)
  const holidays = new Set((data.holidays || []).map(h => h.date))

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= days; d++) cells.push(d)
  while (cells.length % 7) cells.push(null)
  let weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  if (family === 'medium') {
    const todayIdx = weeks.findIndex(wk => wk.some(d => d && ymd(y, m, d) === data.today))
    const from = Math.max(0, todayIdx)
    weeks = weeks.slice(from, from + 2)
  }

  const head = w.addStack()
  head.centerAlignContent()
  head.setPadding(0, 4, 0, 4)
  const title = head.addText(m + '月')
  title.font = Font.boldSystemFont(16)
  title.textColor = ACCENT
  head.addSpacer()
  const sum = head.addText(data.shifts.length + ' 班 · ' + data.total_hours + ' 小時')
  sum.font = Font.systemFont(11)
  sum.textColor = SUB
  w.addSpacer(6)

  const cellH = family === 'medium' ? 38 : 40
  const wd = w.addStack()
  for (let i = 0; i < 7; i++) {
    const c = wd.addStack()
    c.size = new Size(40, 14)
    centered(c, row => {
      const t = row.addText(WEEK[i])
      t.font = Font.systemFont(10)
      t.textColor = i === 0 ? RED : i === 6 ? SAT : SUB
    })
    if (i < 6) wd.addSpacer()
  }
  w.addSpacer(2)

  // 週與週之間放彈性 spacer，讓月曆把小工具的高度撐滿，不會下面空一截
  weeks.forEach((wk, wi) => {
    if (wi > 0) w.addSpacer()
    const row = w.addStack()
    row.topAlignContent()
    for (let i = 0; i < 7; i++) {
      const d = wk[i]
      const cell = row.addStack()
      cell.layoutVertically()
      cell.size = new Size(40, cellH)
      if (d) {
        const iso = ymd(y, m, d)
        const isToday = iso === data.today
        const isPast = iso < data.today
        centered(cell, r => {
          const n = r.addStack()
          n.size = new Size(20, 20)
          n.centerAlignContent()
          if (isToday) { n.backgroundColor = ACCENT; n.cornerRadius = 10 }
          const t = n.addText(String(d))
          t.font = isToday ? Font.boldSystemFont(12) : Font.mediumSystemFont(12)
          t.textColor = isToday ? ON_ACCENT : (i === 0 || holidays.has(iso)) ? RED : i === 6 ? SAT : TEXT
          if (isPast && !isToday) t.textOpacity = 0.4
        })
        for (const s of (byDate[iso] || []).slice(0, 1)) {
          cell.addSpacer(2)
          centered(cell, r => {
            const chip = r.addStack()
            chip.setPadding(1, 5, 1, 5)
            chip.cornerRadius = 5
            chip.backgroundColor = Color.dynamic(new Color(hex(s.color), 0.22), new Color(hex(s.color), 0.38))
            const t = chip.addText(chipText(s))
            t.font = Font.boldSystemFont(10)
            t.textColor = new Color(hex(s.color))
            if (isPast) t.textOpacity = 0.4
          })
        }
      }
      cell.addSpacer()
      if (i < 6) row.addSpacer()
    }
  })
}

w.refreshAfterDate = new Date(Date.now() + 60 * 60 * 1000)
Script.setWidget(w)
if (!config.runsInWidget) await w.presentLarge()
Script.complete()
`
}

export function CalendarFeedSettings() {
  const [expanded, setExpanded] = useState(false)
  const [token, setToken] = useState<string | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [transparentBg, setTransparentBg] = useState(false)

  useEffect(() => {
    api.fetchCalendarToken().then(setToken).catch(() => setToken(null))
  }, [])

  // 網址只在 token 從 API 拿回來之後才會顯示（一定在瀏覽器端），伺服器端渲染時
  // token 還是 undefined，不會用到 window。
  const origin = token ? window.location.origin : ''
  const icsUrl = token ? `${origin}/api/calendar/${token}.ics` : ''
  const webcalUrl = icsUrl.replace(/^https?:/, 'webcal:')
  const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`
  const upcomingUrl = token ? `${origin}/api/calendar/${token}/upcoming` : ''
  const widgetUrl = token ? `${origin}/api/calendar/${token}/widget` : ''
  const monthUrl = token ? `${origin}/api/calendar/${token}/month` : ''
  const monthWidgetUrl = token ? `${origin}/api/calendar/${token}/month-widget` : ''

  async function handleEnable() {
    setBusy(true)
    try { setToken(await api.rotateCalendarToken()) } finally { setBusy(false) }
  }

  async function handleRotate() {
    if (!confirm('重新產生後，舊的訂閱網址和小工具都會失效，要在手機上重新加入一次。確定嗎？')) return
    await handleEnable()
  }

  async function handleDisable() {
    if (!confirm('停用後，已訂閱的行事曆和小工具都會讀不到班表。確定嗎？')) return
    setBusy(true)
    try { await api.disableCalendarToken(); setToken(null) } finally { setBusy(false) }
  }

  async function copy(text: string, kind: string) {
    await navigator.clipboard.writeText(text)
    setCopied(kind)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center justify-between px-4 py-3.5 hover:bg-muted/40"
      >
        <div className="flex items-center gap-2.5">
          <CalendarDaysIcon className="size-4 text-amber-500" />
          <span className="text-sm font-medium">班表同步到手機行事曆／小工具</span>
        </div>
        <div className="flex items-center gap-2">
          {token !== undefined && (
            <span className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              token ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-muted text-muted-foreground',
            )}>
              {token ? '已開啟' : '未開啟'}
            </span>
          )}
          <ChevronDownIcon className={cn('size-4 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
        </div>
      </button>

      {expanded && (
        <div className="flex flex-col gap-4 border-t px-4 py-4">
          {!token ? (
            <>
              <p className="text-xs text-muted-foreground">
                開啟後會產生一個專屬網址，把班表加進 iPhone 行事曆或 Google 日曆，
                就能用手機內建的行事曆小工具在桌面直接看到下一班。網址只能讀班表，不會看到記帳資料。
              </p>
              <button
                onClick={handleEnable}
                disabled={busy || token === undefined}
                className="flex items-center justify-center rounded-xl bg-amber-400 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-60"
              >
                {busy ? '產生中…' : '開啟行事曆訂閱'}
              </button>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium">① 加到手機行事曆（推薦）</p>
                <a
                  href={webcalUrl}
                  className="flex items-center justify-center rounded-xl bg-amber-400 py-2.5 text-sm font-semibold text-white hover:bg-amber-500"
                >
                  加入 iPhone 行事曆
                </a>
                <a
                  href={googleUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center rounded-xl border py-2.5 text-sm font-medium hover:bg-muted/50"
                >
                  加入 Google 日曆（Android）
                </a>
                <button
                  onClick={() => copy(icsUrl, 'url')}
                  className="flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium hover:bg-muted/50"
                >
                  {copied === 'url' ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                  {copied === 'url' ? '已複製！' : '複製訂閱網址'}
                </button>
                <p className="text-xs text-muted-foreground">
                  加好之後，在桌面加上手機內建的「行事曆」小工具就能直接看到班。
                  iPhone 大約每小時同步一次；Google 日曆比較慢，可能要幾個小時。
                </p>
              </div>

              <div className="flex flex-col gap-2 border-t pt-4">
                <p className="text-xs font-medium">② iPhone 專用班表小工具（Scriptable）</p>
                <ol className="list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">
                  <li>App Store 安裝免費的「Scriptable」</li>
                  <li>按下面按鈕複製腳本，在 Scriptable 按 ＋ 新增、貼上</li>
                  <li>回桌面長按 → 加入小工具 → Scriptable，編輯小工具選剛剛的腳本</li>
                </ol>
                <button
                  onClick={() => copy(buildScriptableScript(upcomingUrl, `${origin}/schedule`), 'script')}
                  className="flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium hover:bg-muted/50"
                >
                  {copied === 'script' ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                  {copied === 'script' ? '已複製！' : '複製「下一班」小工具腳本'}
                </button>
                <button
                  onClick={() => copy(buildScriptableMonthScript(monthUrl, `${origin}/schedule`), 'month-script')}
                  className="flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium hover:bg-muted/50"
                >
                  {copied === 'month-script' ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                  {copied === 'month-script' ? '已複製！' : '複製「月曆」小工具腳本'}
                </button>
                <p className="text-xs text-muted-foreground">月曆建議放「大」尺寸看整個月；放「中」尺寸會只顯示本週和下週。兩個腳本可以都加，各自新增一個 Scriptable 小工具。</p>
              </div>

              <div className="flex flex-col gap-2 border-t pt-4">
                <p className="text-xs font-medium">③ Android 專用班表小工具</p>
                <ol className="list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">
                  <li>Play 商店安裝可以顯示網頁的小工具 App（搜尋「網頁小工具」或「Web Widget」）</li>
                  <li>按下面按鈕複製網址</li>
                  <li>回桌面長按 → 小工具 → 加入那個 App 的小工具，貼上網址</li>
                </ol>
                {([
                  { key: 'widget', name: '下一班', url: widgetUrl },
                  { key: 'month-widget', name: '月曆', url: monthWidgetUrl },
                ] as const).map(item => {
                  const url = transparentBg ? `${item.url}?bg=transparent` : item.url
                  return (
                    <div key={item.key} className="flex items-center gap-2">
                      <span className="w-12 flex-none text-xs font-medium">{item.name}</span>
                      <button
                        onClick={() => copy(url, item.key)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-sm font-medium hover:bg-muted/50"
                      >
                        {copied === item.key ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                        {copied === item.key ? '已複製！' : '複製網址'}
                      </button>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted/50"
                      >
                        預覽
                      </a>
                    </div>
                  )
                })}
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={transparentBg} onChange={e => setTransparentBg(e.target.checked)} className="accent-amber-500" />
                  透明背景（讓桌布透出來）
                </label>
                <p className="text-xs text-muted-foreground">畫面會跟著手機的深色／淺色模式自動切換。月曆建議放 4×4 左右的大小。</p>
              </div>

              <div className="flex gap-2 border-t pt-4">
                <button
                  onClick={handleRotate}
                  disabled={busy}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 disabled:opacity-60"
                >
                  <RefreshCwIcon className="size-3.5" />
                  重新產生網址
                </button>
                <button
                  onClick={handleDisable}
                  disabled={busy}
                  className="flex flex-1 items-center justify-center rounded-xl border border-rose-200 py-2 text-xs font-medium text-rose-500 hover:bg-rose-50 disabled:opacity-60 dark:hover:bg-rose-950/20"
                >
                  停用
                </button>
              </div>
              <p className="text-xs text-muted-foreground">網址等於你班表的通行證，不要公開分享；不小心外流就按「重新產生網址」。</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
