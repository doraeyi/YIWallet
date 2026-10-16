import type { Metadata } from 'next'
import { FinalCta, JsonLd, PageHero, PhoneShot } from '@/components/marketing/parts'
import { SITE, pageMeta } from '@/lib/site'
import { cn } from '@/lib/utils'

export const metadata: Metadata = pageMeta('功能介紹', '易記帳的所有功能：自動記帳、三秒記一筆、多帳戶與信用卡帳單、預算提醒、統計分析、現金流、班表薪水、好友分帳、年度回顧。', '/features')

const SECTIONS: { id: string; title: string; body: string[]; shots: [string, string][] }[] = [
  {
    id: 'overview',
    title: '這個月的錢，一頁看完',
    body: ['首頁直接算好月支出、月收入和結餘。', '設好每月預算，快超支時會先提醒你。', '信用卡本期刷了多少、哪天要繳，一起列在下面。'],
    shots: [['dashboard', '首頁總覽（金額已模糊處理）']],
  },
  {
    id: 'record',
    title: '記一筆，三秒鐘',
    body: ['點分類、按金額、按 OK 就記好。', '內建計算機，買好幾樣東西可以直接加起來。', '常用的備註會出現在下面，點一下就填好；懶得打字，按麥克風用說的。'],
    shots: [['add', '新增記帳畫面']],
  },
  {
    id: 'cards',
    title: '每張卡分開算',
    body: ['現金、信用卡、金融卡、悠遊卡各自獨立，左右滑切換。', '信用卡設好結帳日和繳費日，會照本期算消費和待繳金額。', '同一家銀行的卡合併計算可用額度。'],
    shots: [['cards', '卡片檢視（卡號已模糊處理）']],
  },
  {
    id: 'stats',
    title: '錢花去哪，一目了然',
    body: ['支出、收入的分類圓餅圖。', '每天的收支趨勢、每個帳戶各自的進出。', '可以切換週、月、年。'],
    shots: [['stats', '收支分析（金額已模糊處理）'], ['stats-pie', '分類圓餅圖']],
  },
  {
    id: 'cashflow',
    title: '月底之前，先知道夠不夠',
    body: ['排出接下來 45 天會進來的薪水和要繳的卡費。', '扣掉要付出去的，算出還能自由花多少。', '卡費快到期或已經過了繳費日，會特別標出來。'],
    shots: [['cashflow', '現金流（金額已模糊處理）']],
  },
  {
    id: 'schedule',
    title: '排班跟薪水，一起搞定',
    body: ['點月曆上的日期就能排早班、晚班或自訂時間。', '照時薪算這個月的薪水，國定假日自動算兩倍，勞健保扣款也算進去。', '從 LINE 傳班表照片，或直接上傳照片，自動辨識匯入。', '班表可以訂閱到 iPhone 行事曆、Google 日曆，或做成桌面小工具。'],
    shots: [['schedule', '班表月曆（金額已模糊處理）'], ['shift', '排班選單']],
  },
  {
    id: 'friends',
    title: '同事一起排，朋友一起分',
    body: ['跟同事共享班表，誰上哪一班一看就知道。', '一起吃飯，記好的支出點開就能跟好友分帳。'],
    shots: [['friends', '好友列表（姓名已模糊處理）']],
  },
  {
    id: 'recap',
    title: '一年記下來，回頭看看',
    body: ['年度回顧整理出記了幾筆、最常去哪裡、哪個月花最多。', '整理成卡片，可以直接分享。'],
    shots: [['recap', '年度回顧（金額已模糊處理）']],
  },
  {
    id: 'look',
    title: '白天晚上都好看',
    body: ['淺色、深色、跟隨系統三種外觀。', '加到手機主畫面，用起來就像一般 App；電腦上也有完整的桌面版。'],
    shots: [['dark', '深色模式']],
  },
]

export default function FeaturesPage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: SITE.name, item: SITE.url },
            { '@type': 'ListItem', position: 2, name: '功能介紹', item: `${SITE.url}/features` },
          ],
        }}
      />
      <PageHero eyebrow="功能介紹" title="記帳、信用卡、班表薪水，一個 App 全包">
        <p>以下都是實際畫面，金額、卡號和姓名已經模糊處理。</p>
      </PageHero>

      <div className="mx-auto flex max-w-6xl flex-col gap-20 px-5 pb-20 lg:gap-28">
        {SECTIONS.map((s, i) => (
          <section key={s.id} id={s.id} className="grid scroll-mt-24 items-center gap-10 lg:grid-cols-2">
            <div className={cn(i % 2 === 1 && 'lg:order-2')}>
              <h2 className="text-2xl font-black leading-tight lg:text-4xl">{s.title}</h2>
              <ul className="mt-6 flex flex-col gap-3">
                {s.body.map(b => (
                  <li key={b} className="flex gap-3 leading-relaxed text-muted-foreground">
                    <span aria-hidden="true" className="mt-2.5 size-2 shrink-0 rounded-full bg-brand" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div className={cn('flex justify-center gap-4', i % 2 === 1 && 'lg:order-1')}>
              {s.shots.map(([name, alt]) => (
                <div key={name} className={cn('w-full', s.shots.length > 1 ? 'max-w-[240px]' : 'max-w-[300px]')}>
                  <PhoneShot name={name} alt={alt} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <FinalCta />
    </>
  )
}
