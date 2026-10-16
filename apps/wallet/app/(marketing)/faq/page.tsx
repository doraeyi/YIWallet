import type { Metadata } from 'next'
import { pageMeta } from '@/lib/site'
import Link from 'next/link'
import { ChevronDownIcon } from 'lucide-react'
import { FinalCta, JsonLd, PageHero } from '@/components/marketing/parts'

export const metadata: Metadata = pageMeta('常見問題', '易記帳常見問題：要不要錢、要不要下載、支援哪些手機、自動記帳安不安全、怎麼匯出資料、怎麼刪除帳號。', '/faq')

// 答案用純文字，同一份拿來畫畫面和產生 FAQPage 結構化資料，兩邊才不會不一致
const FAQ: { group: string; items: { q: string; a: string; link?: [string, string] }[] }[] = [
  {
    group: '開始使用',
    items: [
      { q: '易記帳要錢嗎？', a: '目前免費使用，註冊就能用全部功能。' },
      { q: '需要下載 App 嗎？', a: '不用。易記帳是網頁 App，用瀏覽器打開 yiwallet.doraeyi.com 就能用；也可以加到手機主畫面，用起來跟一般 App 一樣。', link: ['/install', '看怎麼加到主畫面'] },
      { q: '支援哪些手機和電腦？', a: 'iPhone、Android 手機和平板，還有 Windows、Mac 電腦都可以用，只要有瀏覽器就行。' },
      { q: '換手機資料會不見嗎？', a: '不會。資料存在雲端，換手機或換電腦後登入同一個帳號，紀錄都還在。' },
      { q: '可以用 Google 帳號登入嗎？', a: '可以。在登入頁選「使用 Google 帳號登入」，已經有帳號的話也能到設定裡綁定或解除 Google 帳號。' },
      { q: '忘記密碼怎麼辦？', a: '在登入頁按「忘記密碼？」，輸入註冊的 Email，驗證碼會傳到你綁定的 LINE（有設定的話也會寄到 Email），10 分鐘內輸入就能重設密碼。' },
    ],
  },
  {
    group: '記帳',
    items: [
      { q: 'Apple Pay 付款怎麼自動記帳？', a: '到設定的「付款自動記帳」安裝 iPhone 捷徑，再到捷徑 App 建立一個「錢包」自動化。設定一次之後，每次用 Apple Pay 付款都會自動記一筆。', link: ['/auto-record#apple-pay', '看設定教學'] },
      { q: 'Android 也能自動記帳嗎？', a: '可以。用免費的 MacroDroid 讀 LINE Pay 的付款通知，再轉給易記帳記帳。', link: ['/auto-record#android', '看 Android 教學'] },
      { q: '可以用 LINE 或 Siri 記帳嗎？', a: '可以。綁定 LINE 後傳「全家 茶葉蛋 10」這樣的訊息就會記好；iPhone 裝好「我要記帳」捷徑後，跟 Siri 說「我要記帳」再講內容就行。', link: ['/auto-record#line', '看怎麼設定'] },
      { q: '可以匯入電子發票嗎？', a: '可以。從財政部電子發票平台下載載具發票 CSV，在「對帳」頁上傳，就能一次建立支出紀錄。' },
      { q: '信用卡的帳單怎麼算？', a: '在卡片設定填好結帳日和繳費日，易記帳就會照每一期算本期消費、待繳金額和剩下的額度，同一家銀行的卡會合併計算。' },
      { q: '班表的薪水怎麼算？', a: '時薪工作照排班的時數乘上時薪，國定假日的時數算兩倍，再扣掉你填的勞保、健保和福利金；月薪工作照月薪加上國定假日出勤的加給。' },
    ],
  },
  {
    group: '資料與安全',
    items: [
      { q: '自動記帳需要我的銀行帳號密碼嗎？', a: '不需要。易記帳只讀手機收到的付款通知，不會要你的網路銀行帳號密碼，也不會連到你的銀行。' },
      { q: '我的資料安全嗎？', a: '全站使用 HTTPS 加密傳輸，密碼用 bcrypt 雜湊後才保存，登入憑證存在網頁程式讀不到的 HttpOnly Cookie 裡。', link: ['/security', '看資料安全說明'] },
      { q: '可以匯出我的資料嗎？', a: '可以。到「設定 → 關於 → 匯出記帳資料（CSV）」，所有記帳紀錄都能下載成試算表。' },
      { q: '怎麼刪除帳號？', a: '到「設定 → 刪除帳號」，輸入「刪除帳號」確認後，帳號和所有資料都會永久刪除，無法復原。建議先匯出一份備份。' },
    ],
  },
]

export default function FaqPage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQ.flatMap(g => g.items).map(({ q, a }) => ({
            '@type': 'Question',
            name: q,
            acceptedAnswer: { '@type': 'Answer', text: a },
          })),
        }}
      />
      <PageHero eyebrow="常見問題" title="使用前想知道的事" />

      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-5 pb-20">
        {FAQ.map(g => (
          <section key={g.group}>
            <h2 className="mb-3 px-1 text-sm font-bold tracking-wider text-brand-text">{g.group}</h2>
            <div className="divide-y overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-foreground/5 dark:bg-card">
              {g.items.map(({ q, a, link }) => (
                // 用原生 details：不用 JavaScript 也能展開，搜尋引擎也讀得到答案
                <details key={q} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
                    <h3>{q}</h3>
                    <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-5 pb-5 text-[15px] leading-relaxed text-muted-foreground">
                    <p>{a}</p>
                    {link && (
                      <Link href={link[0]} className="mt-2 inline-block font-semibold text-brand-text hover:underline">{link[1]} →</Link>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <FinalCta />
    </>
  )
}
