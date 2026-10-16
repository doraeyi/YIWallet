import type { Metadata } from 'next'
import { FinalCta, JsonLd, PageHero, PhoneShot } from '@/components/marketing/parts'
import { SITE, pageMeta } from '@/lib/site'

export const metadata: Metadata = pageMeta('自動記帳教學：Apple Pay、LINE Pay、Android', '用 iPhone 捷徑讓 Apple Pay、LINE Pay 付款自動記帳；Android 用 MacroDroid 讀付款通知。也可以傳 LINE、跟 Siri 說，或匯入電子發票。', '/auto-record')

const METHODS: { id: string; title: string; who: string; steps: string[]; shot?: [string, string] }[] = [
  {
    id: 'apple-pay',
    title: 'Apple Pay 付款自動記帳',
    who: 'iPhone',
    steps: [
      '登入易記帳，到「設定 → 付款自動記帳」，切到 iPhone，按「開啟自動記帳」。',
      '按「安裝『錢包』捷徑」，加入捷徑時把記帳網址貼上（易記帳會先幫你複製好）。',
      '打開「捷徑」App → 自動化 → ＋ → 選「錢包」→ 卡片和類別全選 → 勾「立即執行」→「執行捷徑」選「錢包」。',
      '之後用 Apple Pay 付款，就會自動記一筆；卡片會用錢包裡的卡名對應到你在易記帳設定的卡。',
    ],
    shot: ['applepay-setup', 'iPhone 付款自動記帳設定畫面'],
  },
  {
    id: 'line-pay',
    title: 'LINE Pay 付款通知自動記帳',
    who: 'iPhone（iOS 27 以上）',
    steps: [
      '在同一個設定頁按「安裝『Linepay』捷徑」，一樣把記帳網址貼上。',
      '捷徑 App → 自動化 → ＋ → 選「通知」→ App 選 LINE → 名稱包含「LINE錢包」、內文包含「付款完成」→ 勾「立即執行」→「執行捷徑」選「Linepay」。',
      '金額和商店從通知裡自動抓，照付款時段分到早餐、午餐、晚餐；第一次會在 LINE 問你用哪張卡。',
    ],
  },
  {
    id: 'android',
    title: 'Android 付款通知自動記帳',
    who: 'Android',
    steps: [
      '到「設定 → 付款自動記帳」，切到 Android，開啟自動記帳。',
      '從 Play 商店安裝免費的 MacroDroid，打開後照指示允許「通知存取」。',
      '新增巨集：觸發條件選「通知 → 通知已收到」、App 選 LINE、文字包含「付款完成」；動作選「HTTP 請求」，方法 POST、網址貼上記帳網址、內容貼上易記帳提供的範本。',
      '到手機「設定 → 應用程式 → MacroDroid → 電池」改成「不受限制」，避免被省電關掉。',
    ],
    shot: ['android-setup', 'Android 付款自動記帳設定畫面'],
  },
  {
    id: 'line',
    title: '傳 LINE 給機器人記帳',
    who: '所有手機',
    steps: [
      '到「設定 → LINE Bot 自動記帳」綁定你的 LINE 帳號。',
      '之後直接傳訊息給易記帳 Bot，例如「全家 茶葉蛋 10」或「捷運 28」，就會記好。',
      '付款截圖、班表照片也可以傳給 Bot，會先放到「待確認」讓你核對。',
    ],
    shot: ['linebot', 'LINE Bot 綁定畫面'],
  },
  {
    id: 'siri',
    title: '跟 Siri 說「我要記帳」',
    who: 'iPhone',
    steps: [
      '在「付款自動記帳」設定頁按「安裝『我要記帳』捷徑」。',
      '說「嘿 Siri，我要記帳」，再說「午餐一百二 LINE Pay」；Siri 會跟你確認，說「對」就記好。',
      '也可以問「嘿 Siri，我要記帳」→「這個月花多少」，Siri 會唸出本月花費和預算。',
    ],
    shot: ['siri', 'Siri 語音記帳設定'],
  },
  {
    id: 'invoice',
    title: '電子發票整批匯入',
    who: '所有裝置',
    steps: [
      '到財政部電子發票整合服務平台 → 載具發票查詢 → 下載 CSV。',
      '在易記帳「對帳」頁把 CSV 拖進去或點一下上傳，確認後一次建立支出紀錄。',
    ],
    shot: ['invoice', '電子發票 CSV 匯入畫面'],
  },
]

const SHORT: Record<string, string> = {
  'apple-pay': 'Apple Pay', 'line-pay': 'LINE Pay', android: 'Android', line: 'LINE 機器人', siri: 'Siri', invoice: '電子發票',
}

export default function AutoRecordPage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: '用 Apple Pay 付款自動記帳',
          description: '設定 iPhone 捷徑，讓 Apple Pay 付款後自動在易記帳記一筆。',
          step: METHODS[0].steps.map((text, i) => ({ '@type': 'HowToStep', position: i + 1, text })),
          inLanguage: 'zh-TW',
          url: `${SITE.url}/auto-record#apple-pay`,
        }}
      />
      <PageHero eyebrow="自動記帳" title="付完錢，帳就記好了：設定教學">
        <p>設定一次就好。易記帳只讀手機收到的付款通知，<strong className="font-semibold text-foreground">不需要你的銀行帳號密碼</strong>。</p>
      </PageHero>

      {/* 目錄 */}
      <nav aria-label="本頁目錄" className="mx-auto mb-14 flex max-w-3xl flex-wrap justify-center gap-2 px-5">
        {METHODS.map(m => (
          <a key={m.id} href={`#${m.id}`} className="rounded-full bg-white px-4 py-2 text-sm font-medium shadow-sm ring-1 ring-foreground/5 hover:bg-muted dark:bg-card">
            {SHORT[m.id]}
          </a>
        ))}
      </nav>

      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-5 pb-20">
        {METHODS.map(m => (
          <section key={m.id} id={m.id} className="scroll-mt-24 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-foreground/5 lg:p-10 dark:bg-card">
            <div className="grid gap-8 lg:grid-cols-[1fr_260px] lg:items-start">
              <div>
                <p className="text-xs font-semibold tracking-wider text-brand-text">{m.who}</p>
                <h2 className="mt-1 text-xl font-black lg:text-2xl">{m.title}</h2>
                <ol className="mt-5 flex flex-col gap-4">
                  {m.steps.map((s, i) => (
                    <li key={s} className="flex gap-3.5">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-black text-brand-foreground">{i + 1}</span>
                      <span className="pt-0.5 leading-relaxed text-muted-foreground">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
              {m.shot && (
                <div className="mx-auto w-full max-w-[220px] lg:max-w-none">
                  <PhoneShot name={m.shot[0]} alt={m.shot[1]} />
                </div>
              )}
            </div>
          </section>
        ))}

        <p className="rounded-2xl bg-brand-soft px-5 py-4 text-sm leading-relaxed text-brand-soft-foreground">
          記帳網址就像一把鑰匙，拿到的人可以幫你新增支出，所以不要公開分享。不小心外流的話，到設定頁按「重新產生網址」，舊的會立刻失效。
        </p>
      </div>

      <FinalCta />
    </>
  )
}
