'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, SettingsIcon, PlusIcon, CalendarDaysIcon, ReceiptTextIcon } from 'lucide-react'
import { AddTransactionSheet } from './add-transaction-sheet'
import { useTransactions } from '@/hooks/use-transactions'
import { cn } from '@/lib/utils'

const LEFT_ITEMS  = [
  { href: '/dashboard', label: '首頁', icon: HomeIcon },
  { href: '/schedule',  label: '班表', icon: CalendarDaysIcon },
]
const RIGHT_ITEMS = [
  { href: '/statements',  label: '對帳', icon: ReceiptTextIcon },
  { href: '/settings',    label: '設定', icon: SettingsIcon },
]

// 滾動多少距離才觸發縮小/恢復，避免一點點抖動就一直切換
const SCROLL_THRESHOLD = 8

export function MobileNav() {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { addTransaction } = useTransactions()
  const lastScrollY = useRef(0)

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

  async function handleSubmit(data: Parameters<typeof addTransaction>[0], isCash: boolean) {
    const tx = await addTransaction(data)
    if (isCash) {
      const raw = localStorage.getItem('yiwallet_cash_tx_ids') ?? '[]'
      const ids: string[] = JSON.parse(raw)
      ids.push(tx.id)
      localStorage.setItem('yiwallet_cash_tx_ids', JSON.stringify(ids))
    }
    return tx
  }

  return (
    <>
      <AddTransactionSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSubmit={handleSubmit}
      />

      {/* 懸浮的膠囊狀導覽列（比照 IG 改版後的樣式），離螢幕邊緣/底部都留距離，
          不像舊版整條貼齊螢幕邊緣。中間的橘色新增按鈕維持原本凸出來的樣式。
          往下滑內容時 collapsed 會變 true，整條稍微縮小；往上滑或回到頂部
          會恢復原本大小。 */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+22px)] lg:hidden">
        <div
          className={cn(
            'flex w-full max-w-sm items-center rounded-full bg-background/95 px-1 shadow-lg shadow-black/10 ring-1 ring-foreground/10 backdrop-blur-md transition-all duration-200',
          )}
        >
          {/* Left items */}
          {LEFT_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-1 flex-col items-center text-xs font-medium transition-all duration-200',
                  collapsed ? 'py-1.5' : 'py-2.5'
                )}
              >
                <Icon
                  className={cn(
                    'transition-all duration-200',
                    collapsed ? 'size-4' : 'size-5',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span
                  className={cn(
                    'overflow-hidden transition-all duration-200',
                    collapsed ? 'mt-0 max-h-0 opacity-0' : 'mt-0.5 max-h-4 opacity-100',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {label}
                </span>
              </Link>
            )
          })}

          {/* Floating + button */}
          <div className="flex flex-col items-center px-2">
            <button
              onClick={() => setSheetOpen(true)}
              className={cn(
                'mb-1 flex items-center justify-center rounded-full bg-amber-400 shadow-lg shadow-amber-400/30 transition-all duration-200 active:scale-95',
                collapsed ? 'size-11 -translate-y-3' : 'size-14 -translate-y-4'
              )}
            >
              <PlusIcon className={cn('text-white transition-all duration-200', collapsed ? 'size-6' : 'size-7')} strokeWidth={2.5} />
            </button>
          </div>

          {/* Right items */}
          {RIGHT_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-1 flex-col items-center text-xs font-medium transition-all duration-200',
                  collapsed ? 'py-1.5' : 'py-2.5'
                )}
              >
                <Icon
                  className={cn(
                    'transition-all duration-200',
                    collapsed ? 'size-4' : 'size-5',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span
                  className={cn(
                    'overflow-hidden transition-all duration-200',
                    collapsed ? 'mt-0 max-h-0 opacity-0' : 'mt-0.5 max-h-4 opacity-100',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
