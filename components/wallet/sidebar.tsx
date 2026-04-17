'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, BarChart3Icon, SettingsIcon, PlusIcon, WalletIcon, CalendarDaysIcon, LogOutIcon } from 'lucide-react'
import { AddTransactionSheet } from './add-transaction-sheet'
import { useTransactions } from '@/hooks/use-transactions'
import { logout } from '@/app/actions/auth'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: '首頁', icon: HomeIcon },
  { href: '/schedule',  label: '班表', icon: CalendarDaysIcon },
  { href: '/stats',        label: '統計', icon: BarChart3Icon },
  { href: '/settings',     label: '設定', icon: SettingsIcon },
]

export function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { addTransaction } = useTransactions()

  return (
    <>
      <AddTransactionSheet open={open} onOpenChange={setOpen} onSubmit={addTransaction} />

      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r bg-white dark:bg-card">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 border-b px-5">
          <span className="flex size-8 items-center justify-center rounded-xl bg-amber-400 text-white">
            <WalletIcon className="size-4" strokeWidth={2.5} />
          </span>
          <span className="text-base font-bold">易記帳</span>
        </div>

        {/* Add button */}
        <div className="px-3 pt-4 pb-2">
          <button
            onClick={() => setOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-2.5 text-sm font-semibold text-white shadow-sm shadow-amber-400/30 hover:bg-amber-500 active:scale-95 transition-all"
          >
            <PlusIcon className="size-4" strokeWidth={2.5} />
            新增記帳
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 px-3 pt-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="size-4" strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-4">
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOutIcon className="size-4" strokeWidth={2} />
              登出
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
