'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  HomeIcon, SettingsIcon, PlusIcon, CalendarDaysIcon, LogOutIcon, ReceiptTextIcon,
  BarcodeIcon, ListIcon, ChartPieIcon, UsersIcon, BellIcon, ArrowUpRightIcon,
} from 'lucide-react'
import { AddTransactionSheet } from './add-transaction-sheet'
import { useTransactions } from '@/hooks/use-transactions'
import { useMe } from '@/hooks/use-me'
import { logout } from '@/app/actions/auth'
import { cn } from '@/lib/utils'
import { confirmDialog } from '@/lib/confirm'

interface NavItem {
  href: string
  label: string
  icon: typeof HomeIcon
  external?: boolean
  // 子頁面也算這一項（例如 /friends/123/schedule 亮「好友」）
  match?: string[]
}

// 桌機版畫面夠寬，手機版塞在首頁右上角、統計頁裡的入口，這裡直接攤開分組列出來
const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: '記帳',
    items: [
      { href: '/dashboard',    label: '首頁',     icon: HomeIcon },
      { href: '/transactions', label: '收支明細', icon: ListIcon },
      { href: '/stats',        label: '統計',     icon: ChartPieIcon, match: ['/cashflow', '/recap'] },
      { href: '/statements',   label: '對帳',     icon: ReceiptTextIcon },
    ],
  },
  {
    title: '生活',
    items: [
      { href: '/schedule', label: '班表', icon: CalendarDaysIcon },
      { href: '/friends',  label: '好友', icon: UsersIcon },
    ],
  },
]

function isActive(pathname: string, item: NavItem) {
  if (item.external) return false
  const paths = [item.href, ...(item.match ?? [])]
  return paths.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { addTransaction } = useTransactions()
  const { me } = useMe()

  // 桌機快速鍵：按 N 新增一筆（在輸入框裡打字、或有彈窗開著的時候不算）
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'n' && e.key !== 'N') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (document.querySelector('[role="dialog"]')) return
      e.preventDefault()
      setOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const tools: NavItem[] = [
    { href: '/bank-notify', label: '通知', icon: BellIcon },
    ...(me?.canUseBarcode ? [{ href: `${process.env.NEXT_PUBLIC_SOP_APP_URL}/barcode`, label: '條碼查詢', icon: BarcodeIcon, external: true }] : []),
  ]
  const groups = [...GROUPS, { title: '工具', items: tools }]
  const displayName = me?.name || me?.email?.split('@')[0] || '我'

  function renderItem(item: NavItem) {
    const { href, label, icon: Icon, external } = item
    const active = isActive(pathname, item)
    const className = cn(
      'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
      active
        ? 'bg-brand-soft text-brand-soft-foreground'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    )
    const inner = (
      <>
        {active && <span aria-hidden="true" className="absolute inset-y-2 -left-3 w-1 rounded-r-full bg-brand" />}
        <Icon className="size-[18px] shrink-0" strokeWidth={active ? 2.4 : 2} />
        <span className="flex-1">{label}</span>
        {external && <ArrowUpRightIcon className="size-3.5 opacity-0 transition-opacity group-hover:opacity-60" />}
      </>
    )
    return external ? (
      <a key={href} href={href} className={className}>{inner}</a>
    ) : (
      <Link key={href} href={href} data-tour={`nav-${href.slice(1)}`} aria-current={active ? 'page' : undefined} className={className}>
        {inner}
      </Link>
    )
  }

  return (
    <>
      <AddTransactionSheet open={open} onOpenChange={setOpen} onSubmit={addTransaction} />

      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-white lg:flex dark:bg-card">
        {/* Logo */}
        <Link href="/dashboard" className="flex h-16 items-center gap-2.5 px-5">
          <Image src="/icons/logo.png" alt="" width={36} height={36} priority unoptimized className="size-9 rounded-xl bg-white shadow-sm ring-1 ring-black/5" />
          <span className="text-[17px] font-bold tracking-wide">易記帳</span>
        </Link>

        {/* 新增記帳 */}
        <div className="px-3 pt-2 pb-3">
          <button
            onClick={() => setOpen(true)}
            data-tour="add"
            className="group flex w-full items-center gap-2 rounded-xl bg-brand px-3.5 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm shadow-brand/30 transition-all hover:bg-brand-hover hover:shadow-md hover:shadow-brand/30"
          >
            <PlusIcon className="size-4 transition-transform group-hover:rotate-90" strokeWidth={2.5} />
            新增記帳
            <kbd className="ml-auto rounded-md bg-brand-foreground/10 px-1.5 font-sans text-[11px] font-medium">N</kbd>
          </button>
        </div>

        {/* Nav */}
        <nav data-tour="sidebar-nav" className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pt-2 pb-4 scrollbar-none">
          {groups.map(group => (
            <div key={group.title} className="flex flex-col gap-0.5">
              <p className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground/70">{group.title}</p>
              {group.items.map(renderItem)}
            </div>
          ))}
        </nav>

        {/* 設定 + 帳號 */}
        <div className="flex flex-col gap-0.5 border-t px-3 py-3">
          {renderItem({ href: '/settings', label: '設定', icon: SettingsIcon })}
          <div className="mt-1 flex items-center gap-2.5 rounded-xl px-2 py-2">
            <Link href="/settings/profile" className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg hover:opacity-80" aria-label="編輯個人資料">
              {me?.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={me.picture} alt="" className="size-8 shrink-0 rounded-full object-cover ring-1 ring-border" />
              ) : (
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-soft-foreground">
                  {displayName.slice(0, 1)}
                </span>
              )}
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium leading-tight">{displayName}</span>
                {me?.email && <span className="truncate text-[11px] leading-tight text-muted-foreground">{me.email}</span>}
              </span>
            </Link>
            <form action={logout} onSubmit={async e => { e.preventDefault(); if (await confirmDialog('確定要登出嗎？', { confirmText: '登出', danger: true })) await logout() }}>
              <button
                type="submit"
                aria-label="登出"
                title="登出"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <LogOutIcon className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  )
}
