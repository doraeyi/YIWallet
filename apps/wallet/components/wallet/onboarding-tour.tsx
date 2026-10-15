'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTransactions } from '@/hooks/use-transactions'
import { useCards } from '@/hooks/use-cards'
import { useIsDesktop } from '@/hooks/use-is-desktop'
import { cn } from '@/lib/utils'
import {
  BanknoteIcon, BriefcaseIcon, CalendarDaysIcon, CreditCardIcon, LayersIcon, ListIcon, PanelLeftIcon,
  PartyPopperIcon, PlusIcon, SmartphoneIcon, SparklesIcon, WalletCardsIcon, ZapIcon, type LucideIcon,
} from 'lucide-react'

// 新手導覽：畫面變暗、把要介紹的按鈕圈起來，旁邊放說明，「下一步」時圈圈滑到下一個地方。
// 要圈的元素在畫面上加 data-tour="xxx"（手機跟電腦版各有一份的，會挑目前看得到的那個）。
// 步驟可以指定頁面（page），導覽會自己換頁、等那頁的元素出現了再圈；元件放在 layout，換頁不會重來。
//
// 什麼時候出現（只在首頁）：
// - 帳號密碼註冊完會帶 ?welcome=1
// - 還沒有任何記帳跟卡片的帳號（Google 第一次登入的新帳號也算），在這台裝置第一次進首頁
// - 設定頁「再看一次使用教學」帶 ?tour=1，不管看過沒都重來
// 看完或略過就記在這台裝置，不再自動出現。

const DONE_KEY = 'yiwallet_tour_done'

interface Step {
  page: string    // 這一步在哪一頁，不在那頁就先換過去
  target?: string // data-tour 的值；沒有（或那頁找不到）就是畫面正中間的說明卡
  icon: LucideIcon
  title: string
  body: string
  desktopBody?: string  // 電腦版操作方式不一樣時（點 vs 滑）換這段說明
  desktopTarget?: string // 電腦版要圈的範圍不一樣時（例如首頁左欄整塊）
  desktopOnly?: boolean // 只有電腦版有的東西（例如左側選單）
}

const STEPS: Step[] = [
  { page: '/dashboard', icon: SparklesIcon, title: '歡迎使用易記帳', body: '花一分鐘帶你看記帳、班表、設定三個地方，隨時可以按「略過」。' },
  // 首頁
  { page: '/dashboard', target: 'sidebar-nav', desktopOnly: true, icon: PanelLeftIcon, title: '左邊是選單', body: '首頁、收支明細、統計、班表、好友都在這裡，點一下就換頁。' },
  { page: '/dashboard', target: 'add', icon: PlusIcon, title: '記一筆帳', body: '支出、收入都從這裡記：選分類、輸入金額、按 OK 就好。', desktopBody: '支出、收入都從這裡記：選分類、輸入金額、按 OK 就好。在電腦上直接按鍵盤 N 也可以。' },
  { page: '/dashboard', target: 'dash-view', desktopTarget: 'dash-overview', icon: LayersIcon, title: '看每個帳戶', body: '左右滑可以切換「全部」、現金和每一張卡，看各自花了多少、還剩多少。', desktopBody: '點上面的標籤切換「全部」、現金和每一張卡，看各自花了多少、還剩多少。' },
  { page: '/dashboard', target: 'add-card', icon: CreditCardIcon, title: '加入你的卡片', body: '把信用卡、金融卡、悠遊卡加進來，記帳時才能選卡。' },
  { page: '/dashboard', target: 'dash-recent', icon: ListIcon, title: '最近紀錄', body: '點任何一筆都能修改金額、分類、卡片，或刪掉；「查看全部」可以搜尋和篩選。' },
  // 班表
  { page: '/schedule', target: 'sched-calendar', icon: CalendarDaysIcon, title: '排班', body: '點月曆上的日期就能排早班、晚班，或自訂時間；也可以傳班表照片自動匯入。' },
  { page: '/schedule', target: 'sched-salary', icon: BanknoteIcon, title: '薪水自動算', body: '照排的班和時薪算出這個月的薪水，國定假日會自動加倍，領到時一鍵加進收入。' },
  // 設定
  { page: '/settings', target: 'set-cards', icon: WalletCardsIcon, title: '卡片管理', body: '新增、編輯卡片；信用卡設好結帳日和繳費日，會提醒你每期要繳多少。' },
  { page: '/settings', target: 'set-jobs', icon: BriefcaseIcon, title: '工作管理', body: '先在這裡新增工作、時薪和班別（例如早班 7:00–15:00），班表才能排。' },
  { page: '/settings', target: 'set-auto', icon: ZapIcon, title: '自動記帳', body: '綁定 LINE 就能用聊天記帳；下面還能設定 Apple Pay、LINE Pay 付款後自動記一筆。' },
  { page: '/settings', target: 'set-calendar', icon: SmartphoneIcon, title: '班表同步到手機', body: '把班表加進手機的行事曆，或放成桌面小工具，不用打開 App 也看得到下一班。' },
  { page: '/dashboard', icon: PartyPopperIcon, title: '準備好了', body: '先試著記第一筆吧！想再看一次這段介紹，到「設定 → 關於」。' },
]

const SECTION: Record<string, string> = { '/dashboard': '首頁', '/schedule': '班表', '/settings': '設定' }

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
  const router = useRouter()
  const { transactions, isLoaded } = useTransactions()
  const { cards, isLoaded: cardsLoaded } = useCards()
  const [step, setStep] = useState<number | null>(null)
  // 量到的目標位置連同是第幾步一起存，換步驟時舊的位置自然失效，不用在 effect 裡清掉
  const [measured, setMeasured] = useState<{ step: number; rect: DOMRect } | null>(null)
  const isDesktop = useIsDesktop()
  const steps = useMemo(() => STEPS.filter(s => isDesktop || !s.desktopOnly), [isDesktop])

  // 決定要不要開始（等首頁先畫出來再開始，圈圈才找得到東西）
  useEffect(() => {
    if (pathname !== '/dashboard' || step !== null || !isLoaded || !cardsLoaded || isDesktop === undefined) return
    const params = new URLSearchParams(window.location.search)
    const forced = params.has('tour') || params.has('welcome')
    const brandNew = transactions.length === 0 && cards.length === 0
    if (!forced && (isDone() || !brandNew)) return
    const timer = setTimeout(() => setStep(0), 600)
    return () => clearTimeout(timer)
  }, [pathname, step, isLoaded, cardsLoaded, isDesktop, transactions.length, cards.length])

  const finish = useCallback(() => {
    setStep(null)
    try { localStorage.setItem(DONE_KEY, '1') } catch {}
    // 把 ?welcome / ?tour 拿掉，重新整理不會再跑一次
    window.history.replaceState(null, '', window.location.pathname)
  }, [])

  const step0 = step === null ? null : steps[step] ?? null
  const current = useMemo(
    () => (step0 && isDesktop && step0.desktopTarget ? { ...step0, target: step0.desktopTarget } : step0),
    [step0, isDesktop],
  )

  // 這一步不在目前的頁面就先換頁
  const onPage = !!current && pathname === current.page
  useEffect(() => {
    if (current && !onPage) router.push(current.page)
  }, [current, onPage, router])

  // 量目標的位置：剛換頁時元素可能還沒畫出來，每 100ms 找一次、最多 3 秒（找不到就說明卡置中）；
  // 找到後捲到畫面中間，捲動、轉向、視窗大小改變都重新量
  // 找了 3 秒還是沒有目標的步驟（例如還沒建工作，所以沒有薪資區塊），說明卡就改放中間
  const [missing, setMissing] = useState<number | null>(null)
  useLayoutEffect(() => {
    if (step === null || !current?.target || !onPage) return
    const target = current.target
    let el: HTMLElement | null = null
    let tries = 0
    const measure = () => { if (el) setMeasured({ step, rect: el.getBoundingClientRect() }) }
    const poll = setInterval(() => {
      el = findTarget(target)
      tries += 1
      if (el || tries >= 30) {
        clearInterval(poll)
        if (!el) {
          setMissing(step)
          return
        }
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        measure()
        setTimeout(measure, 400) // 等平滑捲動停下來再量一次
      }
    }, 100)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      clearInterval(poll)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step, current, onPage])

  const next = useCallback(() => {
    if (step === null) return
    if (step + 1 >= steps.length) finish()
    else setStep(step + 1)
  }, [step, steps.length, finish])
  const prev = useCallback(() => {
    if (step !== null && step > 0) setStep(step - 1)
  }, [step])

  // 量說明卡實際的高度（內文長短、有沒有上方色塊都不一樣），用來判斷上下左右哪裡放得下
  const [cardH, setCardH] = useState(240)
  const observer = useRef<ResizeObserver | null>(null)
  const cardRef = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect()
    if (!el) return
    observer.current = new ResizeObserver(() => setCardH(el.offsetHeight))
    observer.current.observe(el)
  }, [])

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
  const rect = current.target && onPage && measured?.step === step ? measured.rect : null
  // 換頁中、或還在找這頁的目標：先只留暗幕，等找到再出現圈圈和說明卡，不要先在中間閃一下
  const waiting = !onPage || (!!current.target && !rect && missing !== step)

  const isLast = step === steps.length - 1
  const Icon = current.icon
  const body = (isDesktop && current.desktopBody) || current.body
  const vw = window.innerWidth
  const vh = window.innerHeight
  const wide = vw >= 1024
  const cardWidth = Math.min(rect ? (wide ? 360 : 320) : (wide ? 420 : 340), vw - 32)
  const GAP = PAD + 14
  const M = 16 // 說明卡離畫面邊緣至少留這麼多

  // 說明卡位置，依序找第一個「整張卡都在畫面內」的地方：
  // - 電腦版目標在左邊（側邊欄）或很高（月曆）：先試右邊、左邊，再試下面、上面
  // - 其他：先試下面、上面，電腦版再試右邊、左邊
  // - 都放不下（例如視窗不夠寬、月曆又佔滿整個畫面）：直接疊在目標上，貼著畫面底部，不會被切掉
  // - 沒有目標就置中
  let cardStyle: React.CSSProperties
  if (!rect) {
    cardStyle = { width: cardWidth, left: '50%', top: '50%', translate: '-50% -50%' }
  } else {
    const H = cardH
    const clampX = (x: number) => Math.min(Math.max(M, x), vw - cardWidth - M)
    const clampY = (y: number) => Math.min(Math.max(M, y), vh - H - M)
    const centerX = clampX(rect.left + rect.width / 2 - cardWidth / 2)
    const sideY = clampY(rect.top + rect.height / 2 - H / 2)
    const spots = {
      below: rect.bottom + GAP + H + M <= vh ? { left: centerX, top: rect.bottom + GAP } : null,
      above: rect.top - GAP - H >= M ? { left: centerX, top: rect.top - GAP - H } : null,
      right: wide && rect.right + GAP + cardWidth + M <= vw ? { left: rect.right + GAP, top: sideY } : null,
      left: wide && rect.left - GAP - cardWidth >= M ? { left: rect.left - GAP - cardWidth, top: sideY } : null,
    }
    const preferSide = wide && (rect.right < vw * 0.3 || rect.height > vh * 0.45)
    const order = preferSide
      ? [spots.right, spots.left, spots.below, spots.above]
      : [spots.below, spots.above, spots.right, spots.left]
    const spot = order.find(Boolean) ?? { left: centerX, top: clampY(Math.min(rect.bottom, vh) - H - M) }
    cardStyle = { width: cardWidth, ...spot }
  }
  const progress = ((step + 1) / steps.length) * 100

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={`使用教學：${current.title}`}>
      {/* 擋住底下的操作（點了不會怎樣，避免誤觸跳步驟）；沒有目標時整片變暗 */}
      <div className={cn('absolute inset-0 transition-colors duration-300', rect ? 'bg-transparent' : 'bg-black/60 backdrop-blur-[2px]')} />

      {/* 圈圈：用超大的陰影把四周壓暗，換步驟時滑到下一個目標。
          不用一直閃的 ping 動畫，改成靜態的細框加一圈淡淡的品牌色光暈 */}
      {rect && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-2xl transition-all duration-500 ease-(--ease-out-expo)"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: [
              '0 0 0 2px var(--brand)',
              '0 0 0 6px color-mix(in oklch, var(--brand) 22%, transparent)',
              '0 0 0 9999px rgb(0 0 0 / 0.55)',
            ].join(', '),
          }}
        />
      )}

      {/* 說明卡 */}
      {!waiting && <div
        key={step}
        ref={cardRef}
        className="absolute animate-pop overflow-hidden rounded-3xl bg-background shadow-2xl ring-1 ring-foreground/10"
        style={cardStyle}
      >
        {/* 置中的開場／結尾卡：上面一塊品牌色，放大圖示 */}
        {!rect && (
          <div className="relative flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br from-brand to-brand-hover">
            <span aria-hidden="true" className="absolute -left-6 -top-10 size-32 rounded-full bg-white/15" />
            <span aria-hidden="true" className="absolute -right-8 -bottom-12 size-36 rounded-full bg-white/10" />
            <span className="relative flex size-16 items-center justify-center rounded-2xl bg-white/90 text-brand-foreground shadow-lg">
              <Icon className="size-8" strokeWidth={2} />
            </span>
          </div>
        )}

        <div className={cn('p-5', !rect && 'text-center')}>
          {rect && (
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-soft-foreground">
                <Icon className="size-[18px]" strokeWidth={2.2} />
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {SECTION[current.page]}<span className="mx-1.5 opacity-40">·</span>{step + 1} / {steps.length}
              </span>
            </div>
          )}
          <p className={cn('font-semibold', rect ? 'text-base' : 'text-lg')}>{current.title}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>

          {/* 進度條 */}
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className="h-full rounded-full bg-brand transition-[width] duration-500 ease-(--ease-out-expo)" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-4 flex items-center gap-2">
            {!isLast && (
              <button onClick={finish} className="text-xs text-muted-foreground hover:text-foreground">略過</button>
            )}
            {isDesktop && !isLast && (
              <span className="hidden text-[11px] text-muted-foreground/60 xl:inline">← → 切換</span>
            )}
            <div className={cn('flex gap-2', isLast || step === 0 ? 'flex-1' : 'ml-auto')}>
              {step > 0 && !isLast && (
                <button onClick={prev} className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted/50">上一步</button>
              )}
              <button
                autoFocus
                onClick={next}
                className={cn(
                  'rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground shadow-sm shadow-brand/30 hover:bg-brand-hover',
                  (isLast || step === 0) && 'flex-1 py-2.5',
                )}
              >
                {isLast ? '開始記帳' : step === 0 ? '開始導覽' : '下一步'}
              </button>
            </div>
          </div>
        </div>
      </div>}
    </div>
  )
}
