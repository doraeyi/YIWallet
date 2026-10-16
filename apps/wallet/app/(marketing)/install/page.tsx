import type { Metadata } from 'next'
import { MonitorIcon, SmartphoneIcon } from 'lucide-react'
import { FinalCta, JsonLd, PageHero } from '@/components/marketing/parts'
import { SITE, pageMeta } from '@/lib/site'

export const metadata: Metadata = pageMeta('安裝到手機：加到主畫面', '易記帳不用從 App Store 下載。iPhone 用 Safari、Android 用 Chrome 把易記帳加到主畫面，電腦也能安裝成桌面 App。', '/install')

const DEVICES = [
  {
    id: 'iphone',
    icon: SmartphoneIcon,
    title: 'iPhone',
    steps: ['用 Safari 打開 yiwallet.doraeyi.com', '點下方的「分享」按鈕（方框加往上的箭頭）', '往下滑，選「加入主畫面」', '按右上角「新增」，主畫面就會出現易記帳'],
  },
  {
    id: 'android',
    icon: SmartphoneIcon,
    title: 'Android',
    steps: ['用 Chrome 打開 yiwallet.doraeyi.com', '點右上角的「⋮」', '選「安裝應用程式」或「加到主畫面」', '按「安裝」，主畫面和應用程式清單就會出現易記帳'],
  },
  {
    id: 'desktop',
    icon: MonitorIcon,
    title: '電腦（Chrome、Edge）',
    steps: ['打開 yiwallet.doraeyi.com', '點網址列右邊的「安裝」圖示（螢幕加向下箭頭）', '按「安裝」，就會變成獨立視窗的桌面 App', '不安裝也可以，直接用瀏覽器開就有完整的桌面版'],
  },
]

export default function InstallPage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: '把易記帳加到 iPhone 主畫面',
          step: DEVICES[0].steps.map((text, i) => ({ '@type': 'HowToStep', position: i + 1, text })),
          inLanguage: 'zh-TW',
          url: `${SITE.url}/install#iphone`,
        }}
      />
      <PageHero eyebrow="安裝到手機" title="不用下載，加到主畫面就能用">
        <p>易記帳是網頁 App（PWA），不用到 App Store 或 Play 商店下載。加到主畫面後會有自己的圖示，打開是全螢幕，用起來跟一般 App 一樣。</p>
      </PageHero>

      <div className="mx-auto grid max-w-5xl gap-4 px-5 pb-20 lg:grid-cols-3">
        {DEVICES.map(({ id, icon: Icon, title, steps }) => (
          <section key={id} id={id} className="scroll-mt-24 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-foreground/5 dark:bg-card">
            <h2 className="flex items-center gap-2.5 text-lg font-black">
              <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand-soft-foreground"><Icon className="size-[18px]" /></span>
              {title}
            </h2>
            <ol className="mt-5 flex flex-col gap-3.5">
              {steps.map((s, i) => (
                <li key={s} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-black text-brand-foreground">{i + 1}</span>
                  <span className="text-sm leading-relaxed text-muted-foreground">{s}</span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <FinalCta />
    </>
  )
}
