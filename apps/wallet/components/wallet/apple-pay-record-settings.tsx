'use client'

import { useEffect, useState } from 'react'
import { CheckIcon, ChevronDownIcon, CopyIcon, RefreshCwIcon, ZapIcon } from 'lucide-react'
import * as api from '@/lib/api'
import { cn } from '@/lib/utils'

// iPhone 捷徑「錢包」自動化：每次用 Apple Pay 付款就 POST 商家／金額／卡片到
// /api/auto-record/<token>/apple-pay，後端直接建立一筆支出（見後端 routers/auto_record.py）。
export function ApplePayRecordSettings() {
  const [expanded, setExpanded] = useState(false)
  const [token, setToken] = useState<string | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.fetchRecordToken().then(setToken).catch(() => setToken(null))
  }, [])

  const url = token ? `${window.location.origin}/api/auto-record/${token}/apple-pay` : ''

  async function handleEnable() {
    setBusy(true)
    try { setToken(await api.rotateRecordToken()) } finally { setBusy(false) }
  }

  async function handleRotate() {
    if (!confirm('重新產生後，舊網址立刻失效，要到捷徑裡把網址換成新的。確定嗎？')) return
    await handleEnable()
  }

  async function handleDisable() {
    if (!confirm('停用後，Apple Pay 付款就不會再自動記帳。確定嗎？')) return
    setBusy(true)
    try { await api.disableRecordToken(); setToken(null) } finally { setBusy(false) }
  }

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center justify-between px-4 py-3.5 hover:bg-muted/40"
      >
        <div className="flex items-center gap-2.5">
          <ZapIcon className="size-4 text-amber-500" />
          <span className="text-sm font-medium">Apple Pay 自動記帳</span>
        </div>
        <div className="flex items-center gap-2">
          {token !== undefined && (
            <span className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              token ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-muted text-muted-foreground',
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
                開啟後會產生一個專屬網址，搭配 iPhone「捷徑」的錢包自動化，每次用 Apple Pay 付款
                就會自動記一筆支出（商家、金額、卡片），不用手動輸入。需要 iOS 17 以上。
              </p>
              <button
                onClick={handleEnable}
                disabled={busy || token === undefined}
                className="flex items-center justify-center rounded-xl bg-amber-400 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-60"
              >
                {busy ? '產生中…' : '開啟 Apple Pay 自動記帳'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={copy}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 py-2.5 text-sm font-semibold text-white hover:bg-amber-500"
              >
                {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                {copied ? '已複製！' : '複製記帳網址'}
              </button>

              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium">在 iPhone「捷徑」App 設定</p>
                <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                  <li>下方「自動化」→ 右上 ＋ → 選「<b>錢包</b>」</li>
                  <li>卡片和類別都全選 → 勾「<b>立即執行</b>」→ 下一步 →「新增空白捷徑」</li>
                  <li>加入動作「<b>取得 URL 內容</b>」，網址貼上剛剛複製的記帳網址</li>
                  <li>
                    點「顯示更多」：方法選 <b>POST</b>、要求本文選 <b>JSON</b>，新增 3 個「文字」欄位：
                    <ul className="mt-1 space-y-0.5 pl-1">
                      <li>• <code>amount</code> → 值選變數「捷徑輸入」，再點它改成「<b>金額</b>」</li>
                      <li>• <code>merchant</code> → 「捷徑輸入」改成「<b>商家</b>」</li>
                      <li>• <code>card</code> → 「捷徑輸入」改成「<b>卡片或票卡</b>」</li>
                    </ul>
                  </li>
                  <li>完成。之後用 Apple Pay 付款就會自動記帳，有綁 LINE 的話會收到記帳通知</li>
                </ol>
              </div>

              <p className="text-xs text-muted-foreground">
                卡片會用錢包裡的卡名比對「卡片管理」的卡名或銀行，對不到就不綁卡、把錢包卡名寫在備註。
                分類依商家自動判斷，判斷不出來的歸「其他」。只有 Apple Pay 付款會觸發，條碼支付、實體卡刷卡不會。
              </p>

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
