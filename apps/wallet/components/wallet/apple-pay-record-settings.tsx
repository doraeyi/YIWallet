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

export function ApplePayRecordSettings() {
  const [expanded, setExpanded] = useState(false)
  const [token, setToken] = useState<string | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<'apple-pay' | 'notification' | null>(null)

  useEffect(() => {
    api.fetchRecordToken().then(setToken).catch(() => setToken(null))
  }, [])

  // 同一組 token、兩個入口：Apple Pay 捷徑送結構化資料，iOS 27「收到通知」捷徑送整段通知文字
  const base = token ? `${window.location.origin}/api/auto-record/${token}` : ''
  const urls = { 'apple-pay': `${base}/apple-pay`, notification: `${base}/notification` }

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
          <span className="text-sm font-medium">Apple Pay／LINE Pay 自動記帳</span>
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
                開啟後會產生專屬網址，搭配 iPhone「捷徑」的自動化：用 Apple Pay 付款（iOS 17 以上），
                或收到 LINE Pay 付款完成通知（iOS 27 以上）時，自動記一筆支出，不用手動輸入。
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
            <p className="text-muted-foreground">會先幫你複製好記帳網址；加入捷徑時，在網址那一格<b>長按 → 貼上</b>，再按「加入捷徑」</p>
          </div>
        </li>
        <li className="flex gap-2">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-brand-foreground">2</span>
          <p className="flex-1 leading-relaxed text-muted-foreground">在「捷徑」App 建一個自動化：{automation}</p>
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
