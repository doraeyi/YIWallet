'use client'

import { useEffect, useState } from 'react'
import { CheckIcon, ChevronDownIcon, CopyIcon, DownloadIcon, RefreshCwIcon, ZapIcon } from 'lucide-react'
import * as api from '@/lib/api'
import { cn } from '@/lib/utils'
import { confirmDialog } from '@/lib/confirm'

// iPhone 捷徑「錢包」自動化：每次用 Apple Pay 付款就 POST 商家／金額／卡片到
// /api/auto-record/<token>/apple-pay，後端直接建立一筆支出（見後端 routers/auto_record.py）。
// 分享出去的 iCloud 捷徑。裡面沒有寫死任何人的網址，加入時會用「匯入問題」要使用者貼上自己的，
// 預設答案是空的。換捷徑時記得重新確認這兩點，不然別人付的錢會記到分享者的帳號
const SHORTCUT_LINKS = {
  applePay: 'https://www.icloud.com/shortcuts/d54f6d40f04847858e25805da1612b3b',
  linePay: 'https://www.icloud.com/shortcuts/8d4af8f3f58c4340aba5e65e2df5a875',
}

type Platform = 'ios' | 'android'

// iPhone／iPad 跟 Android 的自動記帳做法不一樣（捷徑 vs MacroDroid）。
// 看到 Android 就是 Android，其他一律先顯示 iPhone 的：iPadOS 的 Safari 會假裝成 Mac、
// 電腦上也猜不到使用者拿哪種手機，反正可以自己切換
function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'ios'
  const ua = navigator.userAgent
  if (/android/i.test(ua)) return 'android'
  return 'ios'
}

function PlatformTabs({ value, onChange }: { value: Platform; onChange: (p: Platform) => void }) {
  return (
    <div role="tablist" className="grid grid-cols-2 rounded-xl bg-muted p-1 text-xs font-medium">
      {([['ios', 'iPhone'], ['android', 'Android']] as const).map(([key, label]) => (
        <button
          key={key}
          role="tab"
          aria-selected={value === key}
          onClick={() => onChange(key)}
          className={cn('rounded-lg py-1.5 transition-colors', value === key ? 'bg-background shadow-sm' : 'text-muted-foreground')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function ApplePayRecordSettings() {
  const [expanded, setExpanded] = useState(false)
  const [token, setToken] = useState<string | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<'apple-pay' | 'notification' | null>(null)
  // 只顯示這支手機用得到的做法；判斷錯了（或要幫別人設定）可以自己切換
  const [platform, setPlatform] = useState<Platform>(detectPlatform)

  useEffect(() => {
    api.fetchRecordToken().then(setToken).catch(() => setToken(null))
  }, [])

  // 同一組 token、兩個入口：Apple Pay 捷徑送結構化資料，iOS 27「收到通知」捷徑送整段通知文字
  // 兩種捷徑貼同一個網址就好：後端看送來的內容（金額 or 通知內文）判斷是哪一種，
  // 以前分 /apple-pay、/notification 兩個網址，常被貼錯
  const recordUrl = token ? `${window.location.origin}/api/auto-record/${token}` : ''
  const urls = { 'apple-pay': recordUrl, notification: recordUrl }

  async function handleEnable() {
    setBusy(true)
    try { setToken(await api.rotateRecordToken()) } finally { setBusy(false) }
  }

  async function handleRotate() {
    if (!(await confirmDialog('重新產生後，舊網址立刻失效，要到捷徑裡把網址換成新的。確定嗎？'))) return
    await handleEnable()
  }

  async function handleDisable() {
    if (!(await confirmDialog('停用後，Apple Pay 付款就不會再自動記帳。確定嗎？', { confirmText: '停用', danger: true }))) return
    setBusy(true)
    try { await api.disableRecordToken(); setToken(null) } finally { setBusy(false) }
  }

  async function copy(kind: 'apple-pay' | 'notification') {
    await navigator.clipboard.writeText(urls[kind])
    setCopied(kind)
    setTimeout(() => setCopied(null), 2000)
  }

  // 一鍵安裝：先把這個人自己的記帳網址複製好，再打開 iCloud 捷徑連結；
  // 捷徑加入時會問「貼上記帳網址」（匯入問題），直接貼上就完成
  async function install(kind: 'apple-pay' | 'notification', link: string) {
    await copy(kind)
    window.location.href = link
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center justify-between px-4 py-3.5 hover:bg-muted/40"
      >
        <div className="flex items-center gap-2.5">
          <ZapIcon className="size-4 text-brand-text" />
          <span className="text-sm font-medium">付款自動記帳（iPhone／Android）</span>
        </div>
        <div className="flex items-center gap-2">
          {token !== undefined && (
            <span className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              token ? 'bg-brand-soft text-brand-soft-foreground' : 'bg-muted text-muted-foreground',
            )}>
              {token ? '已開啟' : '未開啟'}
            </span>
          )}
          <ChevronDownIcon className={cn('size-4 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
        </div>
      </button>

      {expanded && (
        <div className="flex flex-col gap-4 border-t px-4 py-4">
          {!token ? (
            <>
              <p className="text-xs text-muted-foreground">
                開啟後會產生專屬網址，搭配 iPhone「捷徑」的自動化（Apple Pay 付款、iOS 27 的 LINE Pay 付款通知），
                或 Android 的 MacroDroid，付款後自動記一筆支出，不用手動輸入。
              </p>
              <button
                onClick={handleEnable}
                disabled={busy || token === undefined}
                className="flex items-center justify-center rounded-xl bg-brand py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand-hover disabled:opacity-60"
              >
                {busy ? '產生中…' : '開啟自動記帳'}
              </button>
            </>
          ) : (
            <>
              <PlatformTabs value={platform} onChange={setPlatform} />

              {platform === 'ios' ? (
                <>
                <ShortcutSetup
                  title="① Apple Pay"
                  shortcutName="錢包"
                  copied={copied === 'apple-pay'}
                  onCopy={() => copy('apple-pay')}
                  onInstall={() => install('apple-pay', SHORTCUT_LINKS.applePay)}
                  automation={<>自動化 → ＋ → 選「<b>錢包</b>」→ 卡片和類別全選 → 勾「<b>立即執行</b>」→「<b>執行捷徑</b>」選「<b>錢包</b>」</>}
                  note="卡片會用錢包裡的卡名對應「卡片管理」的卡，對不到時 LINE 會問你一次。只有 Apple Pay 付款會觸發，條碼支付、實體卡刷卡不會。"
                  manual={
                    <ol className="list-decimal space-y-1 pl-4">
                      <li>自動化 → ＋ →「錢包」→ 卡片和類別全選 → 立即執行 →「新增空白捷徑」</li>
                      <li>加入「取得 URL 內容」，網址貼上記帳網址；方法 POST、要求本文 JSON</li>
                      <li>文字欄位：<code>amount</code>＝捷徑輸入的「金額」、<code>merchant</code>＝「商家」、<code>card</code>＝「卡片或票卡」</li>
                    </ol>
                  }
                />

                <div className="border-t pt-4">
                  <ShortcutSetup
                    title="② LINE Pay 付款通知（iOS 27 以上）"
                    shortcutName="Linepay"
                    copied={copied === 'notification'}
                    onCopy={() => copy('notification')}
                    onInstall={() => install('notification', SHORTCUT_LINKS.linePay)}
                    automation={<>自動化 → ＋ → 選「<b>通知</b>」→ App 選 <b>LINE</b> → 過濾條件：名稱包含「<b>LINE錢包</b>」、內文包含「<b>付款完成</b>」→ 勾「<b>立即執行</b>」→「<b>執行捷徑</b>」選「<b>Linepay</b>」</>}
                    note="金額和商店從通知裡自動抓，依時段分到早餐、午餐、晚餐；第一次會在 LINE 問你 LINE Pay 扣的是哪張卡。同一筆付款收到兩家通知也只記一次。"
                    manual={
                      <ol className="list-decimal space-y-1 pl-4">
                        <li>自動化 → ＋ →「通知」→ LINE → 名稱包含 LINE錢包、內文包含 付款完成 → 立即執行 →「新增空白捷徑」</li>
                        <li>加入「取得 URL 內容」，網址貼上記帳網址；方法 POST、要求本文 JSON</li>
                        <li>文字欄位：<code>title</code>＝捷徑輸入的「名稱」、<code>text</code>＝「內文」</li>
                      </ol>
                    }
                  />
                </div>

                <div className="border-t pt-4">
                  <SiriSetup voiceUrl={`${recordUrl}/voice`} />
                </div>
                </>
              ) : (
                <AndroidSetup recordUrl={recordUrl} />
              )}

              <div className="flex gap-2 border-t pt-4">
                <button
                  onClick={handleRotate}
                  disabled={busy}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 disabled:opacity-60"
                >
                  <RefreshCwIcon className="size-3.5" />
                  重新產生網址
                </button>
                <button
                  onClick={handleDisable}
                  disabled={busy}
                  className="flex flex-1 items-center justify-center rounded-xl border border-rose-200 py-2 text-xs font-medium text-rose-500 hover:bg-rose-50 disabled:opacity-60 dark:hover:bg-rose-950/20"
                >
                  停用
                </button>
              </div>
              <p className="text-xs text-muted-foreground">這個網址可以直接幫你新增支出，不要公開分享；不小心外流就按「重新產生網址」。</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// 一種自動記帳的設定區塊：一鍵安裝捷徑 → 自己建自動化（Apple 不讓 App 代建）→ 進階的手動設定收起來
function ShortcutSetup({ title, shortcutName, copied, onCopy, onInstall, automation, note, manual }: {
  title: string
  shortcutName: string
  copied: boolean
  onCopy: () => void
  onInstall: () => void
  automation: React.ReactNode
  note: string
  manual: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-sm font-semibold">{title}</p>
      <ol className="flex flex-col gap-2 text-xs">
        <li className="flex gap-2">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-brand-foreground">1</span>
          <div className="flex flex-1 flex-col gap-1.5">
            <button
              onClick={onInstall}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-brand py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand-hover"
            >
              <DownloadIcon className="size-4" />
              安裝「{shortcutName}」捷徑
            </button>
            <p className="text-muted-foreground">會先幫你複製好記帳網址。如果「加入捷徑」按不下去，按下面的「<b>略過設定</b>」就好</p>
          </div>
        </li>
        <li className="flex gap-2">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-brand-foreground">2</span>
          <p className="flex-1 leading-relaxed text-muted-foreground">
            打開剛加入的「<b>{shortcutName}</b>」捷徑，在「取得 URL 內容」的網址那一格<b>長按 → 貼上</b>（加入時已經貼過就跳過）
          </p>
        </li>
        <li className="flex gap-2">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-brand-foreground">3</span>
          <p className="flex-1 leading-relaxed text-muted-foreground">
            到「捷徑」App 的<b>自動化</b>看一下有沒有它；沒有的話照這樣建：{automation}
          </p>
        </li>
      </ol>
      <p className="text-xs text-muted-foreground">{note}</p>
      <details className="group text-xs text-muted-foreground">
        <summary className="cursor-pointer list-none font-medium text-brand-text">
          不用安裝，自己手動設定 <span className="inline-block transition-transform group-open:rotate-90">›</span>
        </summary>
        <div className="mt-2 flex flex-col gap-2 rounded-xl bg-muted/40 p-3">
          <button onClick={onCopy} className="flex items-center justify-center gap-1.5 rounded-lg border bg-background py-2 text-xs font-medium hover:bg-muted/50">
            {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
            {copied ? '已複製！' : '複製記帳網址'}
          </button>
          {manual}
        </div>
      </details>
    </div>
  )
}

// MacroDroid 的 HTTP 請求內容：[notification_title]、[notification] 是 MacroDroid 的魔術文字，
// 執行時會換成通知的標題和內文（通知裡有換行也沒關係，記帳網址那邊會處理）
const MACRODROID_BODY = '{"title":"[notification_title]","text":"[notification]"}'

// Android 沒有 iPhone 捷徑，改用 MacroDroid 讀 LINE Pay 的付款通知、送到同一個記帳網址
function AndroidSetup({ recordUrl }: { recordUrl: string }) {
  const [copied, setCopied] = useState<'url' | 'body' | null>(null)

  async function copy(kind: 'url' | 'body') {
    await navigator.clipboard.writeText(kind === 'url' ? recordUrl : MACRODROID_BODY)
    setCopied(kind)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-sm font-semibold">LINE Pay 付款通知</p>
      <ol className="flex flex-col gap-2 text-xs">
        {[
          <>Play 商店安裝免費的 <b>MacroDroid</b>，打開後照指示允許「通知存取」</>,
          <>新增巨集 → 觸發條件選「<b>通知</b>」→「<b>通知已收到</b>」（Notification Received）→ App 選 <b>LINE</b>，文字包含「<b>付款完成</b>」</>,
          <>
            動作選「<b>連線</b>」→「<b>HTTP 請求</b>」（HTTP Request）：方法 <b>POST</b>、網址貼上記帳網址，
            內容類型 <b>application/json</b>，內容貼上下面的範本
          </>,
          <>到手機「設定 → 應用程式 → MacroDroid → 電池」改成「<b>不受限制</b>」，不然會被省電關掉、收不到通知</>,
        ].map((step, i) => (
          <li key={i} className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-brand-foreground">{i + 1}</span>
            <p className="flex-1 leading-relaxed text-muted-foreground">{step}</p>
          </li>
        ))}
      </ol>
      <div className="grid grid-cols-2 gap-2">
        {([['url', '複製記帳網址'], ['body', '複製內容範本']] as const).map(([kind, label]) => (
          <button
            key={kind}
            onClick={() => copy(kind)}
            className="flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium hover:bg-muted/50"
          >
            {copied === kind ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
            {copied === kind ? '已複製！' : label}
          </button>
        ))}
      </div>
      <code className="block overflow-x-auto rounded-lg bg-muted/50 px-2.5 py-2 text-[11px] whitespace-nowrap">{MACRODROID_BODY}</code>
      <p className="text-xs text-muted-foreground">
        金額和商店從通知裡自動抓，跟 iPhone 一樣依時段分類、第一次會在 LINE 問你扣哪張卡。
        MacroDroid 各版本的選項名稱可能略有不同，找意思相近的就可以。
      </p>
    </div>
  )
}

// Siri 語音記帳：「嘿 Siri，記一筆」→ 說「午餐一百二 LINE Pay」→ Siri 問缺的（分類、付款方式）
// 跟確認 → 記帳。問什麼都由伺服器決定（routers/voice.py），伺服器回一句話、以「？」結尾就是還在問，
// 捷徑只是照著問、把回答送回去，所以捷徑本身是固定的，以後改問法不用重裝。
function SiriSetup({ voiceUrl }: { voiceUrl: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(voiceUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-sm font-semibold">③ 用 Siri 語音記帳</p>
      <p className="text-xs text-muted-foreground">
        說「<b>嘿 Siri，記一筆</b>」，再說「午餐一百二 LINE Pay」。Siri 會跟你確認，沒聽出分類或付款方式也會問你，用說的回答，說「對」才記。
      </p>
      <button
        onClick={copy}
        className="flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium hover:bg-muted/50"
      >
        {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
        {copied ? '已複製！' : '複製語音記帳網址'}
      </button>
      <details className="group text-xs text-muted-foreground">
        <summary className="cursor-pointer list-none font-medium text-brand-text">
          怎麼做這個捷徑 <span className="inline-block transition-transform group-open:rotate-90">›</span>
        </summary>
        <ol className="mt-2 list-decimal space-y-1.5 rounded-xl bg-muted/40 p-3 pl-7">
          <li>捷徑 App → ＋ 新捷徑，名稱取「<b>記一筆</b>」（就是對 Siri 說的那句話）</li>
          <li>加入「<b>聽寫文字</b>」，語言選中文（台灣）</li>
          <li>加入「<b>取得 URL 內容</b>」：網址貼上語音記帳網址、方法 POST、要求本文 JSON，欄位 <code>text</code>＝「聽寫的文字」</li>
          <li>加入「<b>設定變數</b>」：名稱 <code>回應</code>，值＝「URL 的內容」</li>
          <li>加入「<b>重複</b>」6 次，裡面依序放：
            <ul className="mt-1 space-y-1 pl-1">
              <li>• 「<b>如果</b>」<code>回應</code> 不包含 <code>？</code>（全形問號）→「<b>說出文字</b>」<code>回應</code> →「<b>停止此捷徑</b>」</li>
              <li>• 「<b>要求輸入</b>」：提示＝<code>回應</code></li>
              <li>• 「<b>取得 URL 內容</b>」：同一個網址、POST、JSON，欄位 <code>text</code>＝「提供的輸入」</li>
              <li>• 「<b>設定變數</b>」<code>回應</code>＝這次「URL 的內容」</li>
            </ul>
          </li>
        </ol>
      </details>
    </div>
  )
}
