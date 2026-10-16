import type { Metadata } from 'next'
import { pageMeta } from '@/lib/site'
import { CookieIcon, DownloadIcon, HashIcon, KeyRoundIcon, LandmarkIcon, LockKeyholeIcon, Trash2Icon } from 'lucide-react'
import { FinalCta, PageHero } from '@/components/marketing/parts'

export const metadata: Metadata = pageMeta('資料安全', '易記帳怎麼保護你的資料：全程 HTTPS 加密、密碼用 bcrypt 雜湊保存、登入憑證存在 HttpOnly Cookie、自動記帳不需要銀行帳密，資料可以隨時匯出或刪除。', '/security')

const POINTS = [
  { icon: LockKeyholeIcon, title: '全程 HTTPS 加密', body: '你跟易記帳之間傳的所有資料都經過 HTTPS 加密，在網路上傳送時別人看不到內容。' },
  { icon: HashIcon, title: '密碼不存明碼', body: '密碼用 bcrypt 雜湊處理過才存進資料庫。就算是我們，也看不到你原本的密碼。' },
  { icon: CookieIcon, title: '登入憑證鎖起來', body: '登入後的憑證存在 HttpOnly Cookie 裡，網頁上的程式碼讀不到，降低被惡意程式偷走的風險。' },
  { icon: LandmarkIcon, title: '不用給銀行帳密', body: '自動記帳只讀手機收到的付款通知，不會要你的網路銀行帳號密碼，也不會連到你的銀行。' },
  { icon: KeyRoundIcon, title: '記帳網址可以換', body: '自動記帳用的是你專屬的網址。不小心外流的話，到設定頁按「重新產生網址」，舊的立刻失效。' },
  { icon: DownloadIcon, title: '資料隨時可以帶走', body: '到「設定 → 關於 → 匯出記帳資料（CSV）」，所有紀錄都能下載成試算表。' },
  { icon: Trash2Icon, title: '可以直接刪除帳號', body: '到「設定 → 刪除帳號」，帳號和所有資料（記帳紀錄、卡片、工作、班表、好友）會永久刪除，無法復原。' },
]

export default function SecurityPage() {
  return (
    <>
      <PageHero eyebrow="資料安全" title="你的資料，只有你看得到">
        <p>記帳資料很私人，所以我們把能做的保護都先做好。下面是易記帳實際的做法。</p>
      </PageHero>

      <ul className="mx-auto grid max-w-5xl gap-4 px-5 pb-20 sm:grid-cols-2">
        {POINTS.map(({ icon: Icon, title, body }) => (
          <li key={title} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-foreground/5 dark:bg-card">
            <span className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-soft-foreground">
              <Icon className="size-5" />
            </span>
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="mt-1.5 leading-relaxed text-muted-foreground">{body}</p>
          </li>
        ))}
      </ul>

      <FinalCta />
    </>
  )
}
