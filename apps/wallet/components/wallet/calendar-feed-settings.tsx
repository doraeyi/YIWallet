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

export function CalendarFeedSettings() {
  const [expanded, setExpanded] = useState(false)
  const [token, setToken] = useState<string | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<'url' | 'script' | 'widget' | 'widget-transparent' | null>(null)

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

  async function copy(text: string, kind: 'url' | 'script' | 'widget' | 'widget-transparent') {
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
                  {copied === 'script' ? '已複製！' : '複製小工具腳本'}
                </button>
              </div>

              <div className="flex flex-col gap-2 border-t pt-4">
                <p className="text-xs font-medium">③ Android 專用班表小工具</p>
                <ol className="list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">
                  <li>Play 商店安裝可以顯示網頁的小工具 App（搜尋「網頁小工具」或「Web Widget」）</li>
                  <li>按下面按鈕複製網址</li>
                  <li>回桌面長按 → 小工具 → 加入那個 App 的小工具，貼上網址</li>
                </ol>
                <div className="flex gap-2">
                  <button
                    onClick={() => copy(widgetUrl, 'widget')}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium hover:bg-muted/50"
                  >
                    {copied === 'widget' ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                    {copied === 'widget' ? '已複製！' : '複製網址'}
                  </button>
                  <a
                    href={widgetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-1 items-center justify-center rounded-xl border py-2.5 text-sm font-medium hover:bg-muted/50"
                  >
                    預覽
                  </a>
                </div>
                <button
                  onClick={() => copy(`${widgetUrl}?bg=transparent`, 'widget-transparent')}
                  className="text-xs text-muted-foreground underline underline-offset-2"
                >
                  {copied === 'widget-transparent' ? '已複製透明背景版網址！' : '想讓桌布透出來？複製透明背景版網址'}
                </button>
                <p className="text-xs text-muted-foreground">畫面會跟著手機的深色／淺色模式自動切換，每 15 分鐘更新一次。</p>
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
