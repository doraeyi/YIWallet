'use client'

import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTransactions } from '@/hooks/use-transactions'
import { useCards } from '@/hooks/use-cards'
import { cn } from '@/lib/utils'

// 新手導覽：畫面變暗、把要介紹的按鈕圈起來，旁邊放說明，「下一步」時圈圈滑到下一個地方。
// 要圈的元素在畫面上加 data-tour="xxx"（手機跟電腦版各有一份的，會挑目前看得到的那個）。
//
// 什麼時候出現（只在首頁）：
// - 帳號密碼註冊完會帶 ?welcome=1
// - 還沒有任何記帳跟卡片的帳號（Google 第一次登入的新帳號也算），在這台裝置第一次進首頁
// - 設定頁「再看一次使用教學」帶 ?tour=1，不管看過沒都重來
// 看完或略過就記在這台裝置，不再自動出現。

const DONE_KEY = 'yiwallet_tour_done'

interface Step {
  target?: string // data-tour 的值；沒有就是畫面正中間的說明卡
  title: string
  body: string
}

const STEPS: Step[] = [
  { title: '歡迎使用易記帳', body: '花一分鐘帶你看幾個常用的地方，隨時可以按「略過」。' },
  { target: 'add', title: '記一筆帳', body: '支出、收入都從這裡記：選分類、輸入金額、按 OK 就好。' },
  { target: 'add-card', title: '加入你的卡片', body: '把信用卡、金融卡、悠遊卡加進來，記帳時選卡；信用卡設好結帳日，還會算出每期要繳多少。' },
  { target: 'nav-schedule', title: '班表與薪水', body: '排班、或傳班表照片匯入，會照時數算出這個月的薪水。' },
  { target: 'nav-settings', title: '讓它自動記帳', body: '到設定開啟自動記帳：用 Apple Pay、LINE Pay 付款後自動記一筆；綁定 LINE 也能用聊天記帳。' },
  { title: '準備好了', body: '先試著記第一筆吧！想再看一次這段介紹，到「設定 → 關於」。' },
]

const PAD = 8 // 圈圈比目標大一點

function findTarget(name: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)
  return [...all].find(el => el.offsetParent !== null && el.getClientRects().length > 0) ?? null
}

function isDone(): boolean {
  try { return localStorage.getItem(DONE_KEY) === '1' } catch { return false }
}

export function OnboardingTour() {
  const pathname = usePathname()
  const { transactions, isLoaded } = useTransactions()
  const { cards, isLoaded: cardsLoaded } = useCards()
  const [step, setStep] = useState<number | null>(null)
  // 量到的目標位置連同是第幾步一起存，換步驟時舊的位置自然失效，不用在 effect 裡清掉
  const [measured, setMeasured] = useState<{ step: number; rect: DOMRect } | null>(null)

  // 決定要不要開始（等首頁先畫出來再開始，圈圈才找得到東西）
  useEffect(() => {
    if (pathname !== '/dashboard' || step !== null || !isLoaded || !cardsLoaded) return
    const params = new URLSearchParams(window.location.search)
    const forced = params.has('tour') || params.has('welcome')
    const brandNew = transactions.length === 0 && cards.length === 0
    if (!forced && (isDone() || !brandNew)) return
    const timer = setTimeout(() => setStep(0), 600)
    return () => clearTimeout(timer)
  }, [pathname, step, isLoaded, cardsLoaded, transactions.length, cards.length])

  const finish = useCallback(() => {
    setStep(null)
    try { localStorage.setItem(DONE_KEY, '1') } catch {}
    // 把 ?welcome / ?tour 拿掉，重新整理不會再跑一次
    window.history.replaceState(null, '', window.location.pathname)
  }, [])

  const current = step === null ? null : STEPS[step]

  // 量目標的位置；捲動、轉向、視窗大小改變都重新量
  useLayoutEffect(() => {
    if (step === null || !current?.target) return
    const el = findTarget(current.target)
    if (!el) return // 這頁找不到（例如被收起來），說明卡就放中間
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const measure = () => setMeasured({ step, rect: el.getBoundingClientRect() })
    measure()
    const timer = setTimeout(measure, 350) // 等平滑捲動停下來再量一次
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step, current])

  const next = useCallback(() => {
    if (step === null) return
    if (step + 1 >= STEPS.length) finish()
    else setStep(step + 1)
  }, [step, finish])
  const prev = useCallback(() => {
    if (step !== null && step > 0) setStep(step - 1)
  }, [step])

  useEffect(() => {
    if (step === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') finish()
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, next, prev, finish])

  if (step === null || !current) return null
  const rect = current.target && measured?.step === step ? measured.rect : null

  const isLast = step === STEPS.length - 1
  // 說明卡放在目標下面，下面空間不夠就放上面；沒有目標就置中
  const cardWidth = Math.min(320, window.innerWidth - 32)
  const below = rect ? rect.bottom + PAD + 180 < window.innerHeight : true
  const cardStyle: React.CSSProperties = rect
    ? {
        width: cardWidth,
        left: Math.min(Math.max(16, rect.left + rect.width / 2 - cardWidth / 2), window.innerWidth - cardWidth - 16),
        ...(below ? { top: rect.bottom + PAD + 12 } : { bottom: window.innerHeight - rect.top + PAD + 12 }),
      }
    : { width: cardWidth, left: '50%', top: '50%', translate: '-50% -50%' }

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={`使用教學：${current.title}`}>
      {/* 擋住底下的操作（點了不會怎樣，避免誤觸跳步驟）；沒有目標時整片變暗 */}
      <div className={cn('absolute inset-0 transition-colors duration-300', rect ? 'bg-transparent' : 'bg-black/60')} />

      {/* 圈圈：用超大的陰影把四周壓暗，換步驟時滑到下一個目標 */}
      {rect && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-2xl ring-2 ring-brand transition-all duration-500 ease-(--ease-out-expo)"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.6)',
          }}
        >
          <span className="absolute inset-0 animate-ping rounded-2xl ring-2 ring-brand/60 [animation-duration:1.8s]" />
        </div>
      )}

      {/* 說明卡 */}
      <div
        key={step}
        className="absolute animate-pop rounded-2xl bg-background p-4 shadow-xl ring-1 ring-foreground/10"
        style={cardStyle}
      >
        <div className="mb-2 flex gap-1" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i} className={cn('h-1 rounded-full transition-all duration-300', i === step ? 'w-5 bg-brand' : 'w-1.5 bg-muted-foreground/30')} />
          ))}
        </div>
        <p className="text-base font-semibold">{current.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{current.body}</p>
        <div className="mt-4 flex items-center gap-2">
          {!isLast && (
            <button onClick={finish} className="text-xs text-muted-foreground hover:text-foreground">略過</button>
          )}
          <div className="ml-auto flex gap-2">
            {step > 0 && (
              <button onClick={prev} className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted/50">上一步</button>
            )}
            <button
              autoFocus
              onClick={next}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand-hover"
            >
              {isLast ? '開始使用' : step === 0 ? '開始' : '下一步'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
