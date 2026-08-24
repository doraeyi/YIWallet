'use client'

import { useState } from 'react'
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

export function MobileNav() {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)
  const { addTransaction } = useTransactions()

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
          不像舊版整條貼齊螢幕邊緣。中間的橘色新增按鈕維持原本凸出來的樣式。 */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] lg:hidden">
        <div className="flex w-full max-w-sm items-center rounded-full bg-background/95 px-1 shadow-lg shadow-black/10 ring-1 ring-foreground/10 backdrop-blur-md">
          {/* Left items */}
          {LEFT_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium"
              >
                <Icon className={cn('size-5', active ? 'text-primary' : 'text-muted-foreground')} strokeWidth={active ? 2.5 : 1.8} />
                <span className={active ? 'text-primary' : 'text-muted-foreground'}>{label}</span>
              </Link>
            )
          })}

          {/* Floating + button */}
          <div className="flex flex-col items-center px-2">
            <button
              onClick={() => setSheetOpen(true)}
              className="mb-1 flex size-14 -translate-y-4 items-center justify-center rounded-full bg-amber-400 shadow-lg shadow-amber-400/30 active:scale-95 transition-transform"
            >
              <PlusIcon className="size-7 text-white" strokeWidth={2.5} />
            </button>
          </div>

          {/* Right items */}
          {RIGHT_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium"
              >
                <Icon className={cn('size-5', active ? 'text-primary' : 'text-muted-foreground')} strokeWidth={active ? 2.5 : 1.8} />
                <span className={active ? 'text-primary' : 'text-muted-foreground'}>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
