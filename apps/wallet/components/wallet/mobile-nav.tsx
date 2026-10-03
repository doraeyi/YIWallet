'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, SettingsIcon, PlusIcon, CalendarDaysIcon, UsersIcon } from 'lucide-react'
import { AddTransactionSheet } from './add-transaction-sheet'
import { useTransactions } from '@/hooks/use-transactions'
import { cn } from '@/lib/utils'

// 對帳、條碼查詢移到 /dashboard 右上角了，底部導覽列這裡改放好友
const LEFT_ITEMS  = [
  { href: '/dashboard', label: '首頁', icon: HomeIcon },
  { href: '/schedule',  label: '班表', icon: CalendarDaysIcon },
]
const RIGHT_ITEMS = [
  { href: '/friends',  label: '好友', icon: UsersIcon },
  { href: '/settings', label: '設定', icon: SettingsIcon },
]

// 滾動多少距離才觸發縮小/恢復，避免一點點抖動就一直切換
const SCROLL_THRESHOLD = 8

// 子頁面沒有自己的分頁，就讓它所屬的主分頁亮著，使用者才知道自己在哪
const HOME_SUBPAGES = ['/transactions', '/stats', '/statements', '/bank-notify']
function isActiveTab(pathname: string, href: string) {
  if (pathname === href || pathname.startsWith(href + '/')) return true
  return href === '/dashboard' && HOME_SUBPAGES.some(p => pathname.startsWith(p))
}

export function MobileNav() {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)
  // 縮小狀態綁定在「哪一頁縮小的」：換頁之後就自動恢復原本大小，不會帶著上一頁的
  // 縮小狀態跑到下一頁（短頁面捲不動，會一直卡在縮小，切頁時看起來像跳一下）
  const [collapsedOn, setCollapsedOn] = useState<string | null>(null)
  const collapsed = collapsedOn === pathname
  const setCollapsed = (v: boolean) => setCollapsedOn(v ? window.location.pathname : null)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const { addTransaction } = useTransactions()
  const lastScrollY = useRef(0)

  // 手機鍵盤打開時，瀏覽器會把畫面捲動、擠壓可視範圍去讓輸入框露出來，
  // 這台 fixed 定位的導覽列會跟著亂飄／被鍵盤蓋住一部分。與其硬跟瀏覽器
  // 的鍵盤行為打架，鍵盤打開時直接把整條導覽列滑到畫面外，關閉鍵盤後
  // 再滑回來，比較符合大部分 App 的習慣。
  useEffect(() => {
    function isTextInput(target: EventTarget | null) {
      return target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
    }
    function onFocusIn(e: FocusEvent) {
      if (isTextInput(e.target)) setKeyboardOpen(true)
    }
    function onFocusOut(e: FocusEvent) {
      if (isTextInput(e.target)) setKeyboardOpen(false)
    }
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
    }
  }, [])

  // 比照 IG：往下滑（看更多內容）導覽列縮小一點，往上滑（往回看）恢復原本
  // 大小。layout.tsx 裡 <main> 雖然有 overflow-y-auto，但外層是 min-h-dvh
  // （只設下限、沒設上限），內容比一個畫面長的時候，<main> 的高度會直接
  // 撐開跟著內容變高，並不會自己產生內部捲動——實際捲動的是整個網頁，
  // 所以要聽 window 的 scroll，聽 main 元素本身聽不到。
  useEffect(() => {
    lastScrollY.current = window.scrollY

    function onScroll() {
      const currentY = window.scrollY
      const delta = currentY - lastScrollY.current
      if (currentY < 40) {
        setCollapsed(false)
      } else if (delta > SCROLL_THRESHOLD) {
        setCollapsed(true)
      } else if (delta < -SCROLL_THRESHOLD) {
        setCollapsed(false)
      }
      lastScrollY.current = currentY
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <AddTransactionSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSubmit={addTransaction}
      />

      {/* 懸浮的膠囊狀導覽列（比照 IG 改版後的樣式），離螢幕邊緣/底部都留距離，
          不像舊版整條貼齊螢幕邊緣。往下滑內容時整條膠囊用 CSS scale 等比例
          縮小（圖示、文字、間距都是同一個 transform 的一部分，不是個別調整
          尺寸），往上滑或回到頂部會恢復原本大小；中間橘色按鈕本來就是這個
          膠囊的子元素，會跟著一起等比例縮小。 */}
      <nav
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+22px)] transition-transform duration-150 ease-out lg:hidden',
          keyboardOpen && 'translate-y-full'
        )}
      >
        <div
          className={cn(
            'flex w-full max-w-sm items-center rounded-full bg-background/95 px-1 shadow-lg shadow-black/10 ring-1 ring-foreground/10 backdrop-blur-md transition-transform duration-200 ease-out',
            collapsed && 'scale-[0.88]'
          )}
        >
          {/* Left items */}
          {LEFT_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActiveTab(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-1 flex-col items-center gap-0.5 pt-2.5 pb-1.5 text-xs font-medium"
              >
                <Icon
                  className={cn('size-5 transition-all duration-300 ease-(--ease-spring)', active ? 'scale-110 text-brand-text' : 'text-muted-foreground')}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span className={cn('transition-colors', active ? 'text-brand-text' : 'text-muted-foreground')}>{label}</span>
                <span
                  aria-hidden="true"
                  className={cn('size-1 rounded-full bg-brand transition-all duration-300', active ? 'scale-100 opacity-100' : 'scale-0 opacity-0')}
                />
              </Link>
            )
          })}

          {/* Floating + button */}
          <div className="flex flex-col items-center px-2">
            <button
              onClick={() => setSheetOpen(true)}
              aria-label="新增記帳"
              className="mb-1 flex size-14 -translate-y-4 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-hover shadow-lg shadow-brand/40 transition-transform duration-300 ease-(--ease-spring) hover:rotate-90 active:scale-90"
            >
              <PlusIcon className="size-7 text-brand-foreground" strokeWidth={2.5} />
            </button>
          </div>

          {/* Right items */}
          {RIGHT_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActiveTab(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-1 flex-col items-center gap-0.5 pt-2.5 pb-1.5 text-xs font-medium"
              >
                <Icon
                  className={cn('size-5 transition-all duration-300 ease-(--ease-spring)', active ? 'scale-110 text-brand-text' : 'text-muted-foreground')}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span className={cn('transition-colors', active ? 'text-brand-text' : 'text-muted-foreground')}>{label}</span>
                <span
                  aria-hidden="true"
                  className={cn('size-1 rounded-full bg-brand transition-all duration-300', active ? 'scale-100 opacity-100' : 'scale-0 opacity-0')}
                />
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
