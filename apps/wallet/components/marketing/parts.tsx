import Image from 'next/image'
import Link from 'next/link'
import { ArrowRightIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// 介紹網站共用的小元件（都是 server component，搜尋引擎看得到完整內容）

// 套好手機外框的截圖（public/marketing/*.webp，金額、卡號等已經霧化）
export function PhoneShot({ name, alt, className, priority }: { name: string; alt: string; className?: string; priority?: boolean }) {
  return (
    <Image
      src={`/marketing/${name}.webp`}
      alt={alt}
      width={416}
      height={914}
      priority={priority}
      sizes="(min-width: 1024px) 320px, 60vw"
      className={cn('h-auto w-full drop-shadow-[0_24px_40px_rgb(120_80_10/0.22)]', className)}
    />
  )
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 inline-flex rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold tracking-wider text-brand-soft-foreground">
      {children}
    </p>
  )
}

export function PageHero({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="mx-auto max-w-3xl px-5 pt-12 pb-10 text-center lg:pt-20 lg:pb-14">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="text-3xl font-black leading-tight tracking-tight text-balance lg:text-5xl">{title}</h1>
      {children && <div className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty lg:text-lg">{children}</div>}
    </header>
  )
}

export function CtaButtons({ center }: { center?: boolean }) {
  return (
    <div className={cn('flex flex-wrap gap-3', center && 'justify-center')}>
      <Link
        href="/register"
        className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-bold text-brand-foreground shadow-sm shadow-brand/40 transition-colors hover:bg-brand-hover"
      >
        免費開始使用
        <ArrowRightIcon className="size-4" />
      </Link>
      <Link href="/login" className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-foreground shadow-sm ring-1 ring-foreground/10 transition-colors hover:bg-muted">
        我已經有帳號
      </Link>
    </div>
  )
}

export function FinalCta() {
  return (
    <section className="mx-auto max-w-5xl px-5 pb-20">
      <div className="rounded-[2rem] bg-brand px-6 py-12 text-center text-brand-foreground lg:py-16">
        <h2 className="text-2xl font-black lg:text-4xl">付完錢，帳就記好了。</h2>
        <p className="mt-3 text-sm opacity-80 lg:text-base">打開瀏覽器就能用，不用下載。目前免費。</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-brand-foreground px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90">
            免費開始使用
            <ArrowRightIcon className="size-4" />
          </Link>
          <Link href="/install" className="inline-flex items-center rounded-full bg-white/70 px-6 py-3 text-sm font-semibold transition-colors hover:bg-white">
            怎麼加到手機主畫面
          </Link>
        </div>
      </div>
    </section>
  )
}

// JSON-LD 結構化資料（照 Next.js 文件的做法，把 < 換掉避免 XSS）
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}
