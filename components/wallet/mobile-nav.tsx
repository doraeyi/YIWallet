'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, BarChart3Icon, SettingsIcon, PlusIcon, CalendarDaysIcon } from 'lucide-react'
import { AddTransactionSheet } from './add-transaction-sheet'
import { useTransactions } from '@/hooks/use-transactions'
import { cn } from '@/lib/utils'

const LEFT_ITEMS  = [
  { href: '/dashboard', label: '首頁', icon: HomeIcon },
  { href: '/schedule',  label: '班表', icon: CalendarDaysIcon },
]
const RIGHT_ITEMS = [
  { href: '/stats',    label: '統計', icon: BarChart3Icon },
  { href: '/settings', label: '設定', icon: SettingsIcon },
]

export function MobileNav() {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)
  const { addTransaction } = useTransactions()

  return (
    <>
      <AddTransactionSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSubmit={addTransaction}
      />

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center border-t bg-background safe-area-pb lg:hidden">
        {/* Left items */}
        {LEFT_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium"
            >
              <Icon className={cn('size-5', active ? 'text-primary' : 'text-muted-foreground')} strokeWidth={active ? 2.5 : 1.8} />
              <span className={active ? 'text-primary' : 'text-muted-foreground'}>{label}</span>
            </Link>
          )
        })}

        {/* Floating + button */}
        <div className="flex flex-col items-center px-3">
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
              className="flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium"
            >
              <Icon className={cn('size-5', active ? 'text-primary' : 'text-muted-foreground')} strokeWidth={active ? 2.5 : 1.8} />
              <span className={active ? 'text-primary' : 'text-muted-foreground'}>{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
