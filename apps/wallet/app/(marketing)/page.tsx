import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRightIcon, BellRingIcon, CalendarDaysIcon, ChartPieIcon, CreditCardIcon, LockKeyholeIcon, MessageCircleIcon,
  MicIcon, PiggyBankIcon, ReceiptTextIcon, SmartphoneIcon, UsersIcon, ZapIcon,
} from 'lucide-react'
import { CtaButtons, Eyebrow, FinalCta, JsonLd, PhoneShot } from '@/components/marketing/parts'
import { SITE, pageMeta } from '@/lib/site'

export const metadata: Metadata = pageMeta(`${SITE.fullName}｜Apple Pay 自動記帳、信用卡與班表薪水管理`, SITE.description, '/', true)

const FEATURES = [
  { icon: ZapIcon, title: '付款自動記帳', body: 'Apple Pay、LINE Pay 付完款，通知一到就自動記好，還會照時段分到早餐、午餐、晚餐。', href: '/auto-record' },
  { icon: ReceiptTextIcon, title: '三秒記一筆', body: '點分類、按金額、按 OK。內建計算機，常用備註點一下就填好。', href: '/features#record' },
  { icon: MessageCircleIcon, title: 'LINE、Siri 也能記', body: '傳「全家 茶葉蛋 10」給 LINE 機器人，或跟 Siri 說「我要記帳」。', href: '/auto-record#line' },
  { icon: CreditCardIcon, title: '信用卡帳單', body: '本期刷了多少、哪天要繳、還剩多少額度，同一家銀行的卡合併看。', href: '/features#cards' },
  { icon: PiggyBankIcon, title: '預算與現金流', body: '設好每月預算，快超支先提醒；排出接下來 45 天的發薪跟卡費。', href: '/features#cashflow' },
  { icon: ChartPieIcon, title: '統計分析', body: '分類圓餅圖、每日收支趨勢、年度回顧，錢花去哪一眼就知道。', href: '/features#stats' },
  { icon: CalendarDaysIcon, title: '班表與薪水', body: '點日期排班，照時薪算薪水，國定假日自動加倍；班表照片能辨識匯入。', href: '/features#schedule' },
  { icon: UsersIcon, title: '好友共享', body: '跟同事共享班表，跟朋友一起分帳。', href: '/features#friends' },
]

const FAQ_PREVIEW = [
  { q: '易記帳要錢嗎？', a: '目前免費使用。' },
  { q: '需要下載 App 嗎？', a: '不用。用瀏覽器打開 yiwallet.doraeyi.com 就能用，也可以加到手機主畫面，用起來跟一般 App 一樣。' },
  { q: '自動記帳需要我的銀行帳號密碼嗎？', a: '不需要。易記帳只讀手機收到的付款通知，不會碰你的網路銀行。' },
]

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            { '@type': 'WebSite', name: SITE.name, alternateName: [SITE.englishName, SITE.fullName], url: SITE.url, inLanguage: 'zh-TW' },
            { '@type': 'Organization', name: SITE.fullName, url: SITE.url, logo: `${SITE.url}/icons/icon-512x512.png` },
            {
              '@type': 'WebApplication',
              name: SITE.fullName,
              url: SITE.url,
              description: SITE.description,
              applicationCategory: 'FinanceApplication',
              operatingSystem: 'iOS, Android, Windows, macOS',
              inLanguage: 'zh-TW',
            },
          ],
        }}
      />

      {/* ── 首屏 ── */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pt-10 pb-16 lg:grid-cols-[1.05fr_1fr] lg:pt-16 lg:pb-24">
        <div>
          <Eyebrow>{SITE.fullName}</Eyebrow>
          <h1 className="text-4xl font-black leading-[1.15] tracking-tight lg:text-6xl">
            付完錢，<br />帳就記好了。
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground text-pretty lg:text-lg">
            Apple Pay、LINE Pay 付完款自動記帳，信用卡帳單、預算、班表薪水一起管。不用下載，iPhone、Android、電腦打開瀏覽器就能用，<strong className="font-semibold text-foreground">目前免費</strong>。
          </p>
          <div className="mt-8">
            <CtaButtons />
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-1.5"><LockKeyholeIcon className="size-4 text-brand-text" />不用給銀行帳密</li>
            <li className="flex items-center gap-1.5"><SmartphoneIcon className="size-4 text-brand-text" />加到主畫面就像 App</li>
            <li className="flex items-center gap-1.5"><MicIcon className="size-4 text-brand-text" />可以用說的記帳</li>
          </ul>
        </div>
        <div className="relative mx-auto flex w-full max-w-md justify-center">
          <span aria-hidden="true" className="absolute inset-x-6 top-10 bottom-6 -z-10 rounded-full bg-brand/25 blur-3xl" />
          <PhoneShot name="dashboard" alt="易記帳首頁：月支出、月收入、結餘與信用卡本期消費（金額已模糊處理）" priority className="w-[62%] -rotate-3" />
          <PhoneShot name="add" alt="記一筆帳：選分類、輸入金額、選付款方式" priority className="-ml-[18%] mt-14 w-[52%] rotate-3" />
        </div>
      </section>

      {/* ── 功能總覽 ── */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="mb-10 text-center">
          <Eyebrow>功能</Eyebrow>
          <h2 className="text-2xl font-black lg:text-4xl">記帳要用到的，都在這裡</h2>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body, href }) => (
            <li key={title}>
              <Link href={href} className="group flex h-full flex-col rounded-3xl bg-white p-6 shadow-sm ring-1 ring-foreground/5 transition-shadow hover:shadow-md dark:bg-card">
                <span className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-soft-foreground">
                  <Icon className="size-5" />
                </span>
                <h3 className="font-bold">{title}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-text">
                  了解更多 <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ── 自動記帳 ── */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-20 lg:grid-cols-2">
        <div className="order-2 mx-auto w-full max-w-[300px] lg:order-1">
          <PhoneShot name="applepay-setup" alt="付款自動記帳設定：一鍵安裝 iPhone 捷徑" />
        </div>
        <div className="order-1 lg:order-2">
          <Eyebrow>自動記帳</Eyebrow>
          <h2 className="text-2xl font-black leading-tight lg:text-4xl">設定一次，之後付錢就自動記</h2>
          <ol className="mt-6 flex flex-col gap-4">
            {[
              ['用 Apple Pay 或 LINE Pay 付款', '跟平常一樣嗶一下就好。'],
              ['手機收到付款通知', 'iPhone 用捷徑、Android 用 MacroDroid 把通知轉給易記帳。'],
              ['自動記下這一筆', '金額、商店、卡片自動帶入，照時段分好類。'],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-black text-brand-foreground">{i + 1}</span>
                <span>
                  <span className="block font-bold">{t}</span>
                  <span className="block text-sm text-muted-foreground">{d}</span>
                </span>
              </li>
            ))}
          </ol>
          <Link href="/auto-record" className="mt-7 inline-flex items-center gap-1.5 font-semibold text-brand-text hover:underline">
            看設定教學 <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </section>

      {/* ── 班表薪水 ── */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-20 lg:grid-cols-2">
        <div>
          <Eyebrow>給打工族</Eyebrow>
          <h2 className="text-2xl font-black leading-tight lg:text-4xl">排班、算薪水，跟記帳放在一起</h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            點月曆上的日期就能排早班、晚班。照時薪算出這個月的薪水，國定假日自動算兩倍，勞健保扣款也算進去；領到薪水一鍵加進收入。班表還能同步到手機行事曆。
          </p>
          <Link href="/features#schedule" className="mt-6 inline-flex items-center gap-1.5 font-semibold text-brand-text hover:underline">
            看班表功能 <ArrowRightIcon className="size-4" />
          </Link>
        </div>
        <div className="mx-auto w-full max-w-[300px]">
          <PhoneShot name="schedule" alt="班表月曆與本月薪資預估（金額已模糊處理）" />
        </div>
      </section>

      {/* ── 資安 ── */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-foreground/5 lg:p-12 dark:bg-card">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-center">
            <div>
              <Eyebrow>資料安全</Eyebrow>
              <h2 className="text-2xl font-black leading-tight lg:text-3xl">你的資料，只有你看得到</h2>
              <Link href="/security" className="mt-5 inline-flex items-center gap-1.5 font-semibold text-brand-text hover:underline">
                看我們怎麼保護資料 <ArrowRightIcon className="size-4" />
              </Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                ['全程 HTTPS 加密', '資料在網路上傳送都經過加密。'],
                ['密碼不存明碼', '用 bcrypt 雜湊後才存，沒人看得到原始密碼。'],
                ['登入憑證鎖起來', '存在 HttpOnly Cookie，網頁程式讀不到。'],
                ['不用給銀行帳密', '自動記帳只讀付款通知。'],
              ].map(([t, d]) => (
                <li key={t} className="rounded-2xl bg-muted/50 p-4">
                  <p className="flex items-center gap-2 font-bold"><LockKeyholeIcon className="size-4 text-brand-text" />{t}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{d}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── 常見問題預覽 ── */}
      <section className="mx-auto max-w-3xl px-5 pb-20">
        <h2 className="mb-6 text-center text-2xl font-black lg:text-3xl">常見問題</h2>
        <div className="divide-y rounded-3xl bg-white shadow-sm ring-1 ring-foreground/5 dark:bg-card">
          {FAQ_PREVIEW.map(({ q, a }) => (
            <div key={q} className="p-5">
              <h3 className="font-bold">{q}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-center">
          <Link href="/faq" className="inline-flex items-center gap-1.5 font-semibold text-brand-text hover:underline">
            看全部問題 <ArrowRightIcon className="size-4" />
          </Link>
        </p>
      </section>

      <section className="mx-auto mb-20 flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5"><BellRingIcon className="size-4" />淺色、深色模式</span>
        <span className="flex items-center gap-1.5"><CalendarDaysIcon className="size-4" />班表同步到行事曆</span>
        <span className="flex items-center gap-1.5"><ReceiptTextIcon className="size-4" />電子發票匯入</span>
      </section>

      <FinalCta />
    </>
  )
}
