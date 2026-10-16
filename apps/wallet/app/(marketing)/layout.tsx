import Image from 'next/image'
import Link from 'next/link'
import { MARKETING_PAGES, SITE } from '@/lib/site'

// 介紹網站的外框：上方導覽、下方頁尾。只給沒登入的人看（已登入的人進首頁會直接到 App）。
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[linear-gradient(180deg,#fffcf5_0%,#fff6e3_100%)] text-foreground dark:bg-none dark:bg-background">
      <header className="sticky top-0 z-40 border-b border-foreground/5 bg-[#fffcf5]/85 backdrop-blur-md dark:bg-background/85">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${SITE.fullName} 首頁`}>
            <Image src="/icons/logo.png" alt="" width={36} height={36} unoptimized className="size-9 rounded-xl bg-white shadow-sm ring-1 ring-black/5" />
            <span className="text-[17px] font-bold">{SITE.name}</span>
            <span className="hidden text-sm font-medium text-muted-foreground sm:inline">{SITE.englishName}</span>
          </Link>
          <nav aria-label="主要導覽" className="hidden flex-1 items-center gap-1 lg:flex">
            {MARKETING_PAGES.map(p => (
              <Link key={p.href} href={p.href} className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground">
                {p.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">登入</Link>
            <Link href="/register" className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-brand-foreground shadow-sm shadow-brand/30 hover:bg-brand-hover">免費開始</Link>
          </div>
        </div>
        {/* 手機版：導覽改成可以左右滑的一排 */}
        <nav aria-label="主要導覽" className="flex gap-1 overflow-x-auto px-3 pb-2 scrollbar-none lg:hidden">
          {MARKETING_PAGES.map(p => (
            <Link key={p.href} href={p.href} className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-black/5 hover:text-foreground">
              {p.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-foreground/5">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="flex items-center gap-2 font-bold">
              <Image src="/icons/logo.png" alt="" width={24} height={24} unoptimized className="size-6 rounded-md bg-white ring-1 ring-black/5" />
              {SITE.fullName}
            </p>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">{SITE.tagline}不用下載，iPhone、Android、電腦打開瀏覽器就能用。</p>
          </div>
          <nav aria-label="頁尾導覽" className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
            {MARKETING_PAGES.map(p => (
              <Link key={p.href} href={p.href} className="text-muted-foreground hover:text-foreground">{p.label}</Link>
            ))}
            <Link href="/login" className="text-muted-foreground hover:text-foreground">登入</Link>
          </nav>
        </div>
        <p className="pb-8 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} {SITE.fullName}</p>
      </footer>
    </div>
  )
}
