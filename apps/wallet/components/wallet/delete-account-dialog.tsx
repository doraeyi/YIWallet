'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { logout } from '@/app/actions/auth'
import { toast } from '@/lib/toast'

const CONFIRM_TEXT = '刪除帳號'

// 永久刪除帳號：要自己打「刪除帳號」四個字才按得下去，避免誤觸。
// 後端 DELETE /users/me 會把交易、卡片、班表、好友等全部刪掉，刪完直接登出。
export function DeleteAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [typed, setTyped] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (typed !== CONFIRM_TEXT || deleting) return
    setDeleting(true)
    try {
      const res = await fetch('/api/backend/users/me', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: CONFIRM_TEXT }),
      })
      if (!res.ok) throw new Error()
    } catch {
      toast('刪除失敗，資料沒有變動，請稍後再試', 'error')
      setDeleting(false)
      return
    }
    await logout()
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!deleting) { onOpenChange(o); setTyped('') } }}>
      <DialogContent showCloseButton={false} className="max-w-sm gap-0 p-0">
        <DialogTitle className="px-5 pt-5 text-base font-semibold text-rose-500">刪除帳號</DialogTitle>
        <div className="flex flex-col gap-3 px-5 py-4 text-sm">
          <p>這會<b>永久刪除</b>你的帳號和所有資料，包括記帳紀錄、卡片、工作、班表、好友，<b>刪除後無法復原</b>。</p>
          <p className="text-muted-foreground">想留一份的話，先到「關於 → 匯出記帳資料（CSV）」下載。</p>
          <label htmlFor="delete-confirm" className="text-xs text-muted-foreground">
            確定要刪除的話，請輸入「{CONFIRM_TEXT}」
          </label>
          <input
            id="delete-confirm"
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder={CONFIRM_TEXT}
            className="rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-rose-400"
          />
        </div>
        <div className="flex gap-2 border-t p-3">
          <button
            onClick={() => { onOpenChange(false); setTyped('') }}
            disabled={deleting}
            className="flex-1 rounded-xl border py-2.5 text-sm font-medium hover:bg-muted/50"
          >
            取消
          </button>
          <button
            onClick={handleDelete}
            disabled={typed !== CONFIRM_TEXT || deleting}
            className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-40"
          >
            {deleting ? '刪除中…' : '永久刪除'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
