'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { answerConfirm, subscribeConfirm, type ConfirmRequest } from '@/lib/confirm'
import { cn } from '@/lib/utils'

export function ConfirmHost() {
  const [req, setReq] = useState<ConfirmRequest | null>(null)

  useEffect(() => subscribeConfirm(setReq), [])

  return (
    <Dialog open={!!req} onOpenChange={open => { if (!open) answerConfirm(false) }}>
      <DialogContent showCloseButton={false} className="z-[90] max-w-xs gap-0 p-0">
        <DialogTitle className="sr-only">確認</DialogTitle>
        <p className="whitespace-pre-line px-5 pt-5 pb-4 text-center text-sm">{req?.message}</p>
        <div className="flex gap-2 border-t p-3">
          <button
            onClick={() => answerConfirm(false)}
            className="flex-1 rounded-xl border py-2.5 text-sm font-medium hover:bg-muted/50"
          >
            取消
          </button>
          <button
            autoFocus
            onClick={() => answerConfirm(true)}
            className={cn(
              'flex-1 rounded-xl py-2.5 text-sm font-semibold text-white',
              req?.danger ? 'bg-rose-500 hover:bg-rose-600' : 'bg-amber-400 hover:bg-amber-500',
            )}
          >
            {req?.confirmText ?? '確定'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
