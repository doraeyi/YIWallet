'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { requestPasswordReset, resetPassword } from '@/app/actions/auth'
import { PasswordInput } from '@/components/wallet/password-input'

const INPUT = 'w-full rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-ring'
const LABEL = 'mb-1.5 block text-sm font-medium'

export default function ForgotPasswordPage() {
  const [sendState, sendAction, sending] = useActionState(requestPasswordReset, undefined)
  const [resetState, resetAction, resetting] = useActionState(resetPassword, undefined)
  const sentTo = resetState?.sentTo ?? sendState?.sentTo

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">忘記密碼</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sentTo ? `驗證碼已寄到 ${sentTo}，10 分鐘內有效` : '輸入註冊的 Email，我們會寄 6 位數驗證碼給你'}
          </p>
        </div>

        {!sentTo ? (
          <form action={sendAction} className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm dark:bg-card">
            <div>
              <label htmlFor="email" className={LABEL}>電子郵件</label>
              <input id="email" name="email" type="email" required autoComplete="email" placeholder="輸入 Email" className={INPUT} />
            </div>
            {sendState?.error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-500">{sendState.error}</p>}
            <button type="submit" disabled={sending} className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-brand-foreground hover:bg-brand-hover disabled:opacity-60">
              {sending ? '寄送中…' : '寄送驗證碼'}
            </button>
          </form>
        ) : (
          <form action={resetAction} className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm dark:bg-card">
            <input type="hidden" name="email" value={sentTo} />
            <div>
              <label htmlFor="code" className={LABEL}>驗證碼</label>
              <input id="code" name="code" required inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6 位數字" className={INPUT} />
            </div>
            <div>
              <label htmlFor="password" className={LABEL}>新密碼</label>
              <PasswordInput id="password" name="password" required autoComplete="new-password" placeholder="至少 6 個字元" />
            </div>
            <div>
              <label htmlFor="confirm" className={LABEL}>再輸入一次新密碼</label>
              <PasswordInput id="confirm" name="confirm" required autoComplete="new-password" placeholder="再輸入一次" />
            </div>
            {resetState?.error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-500">{resetState.error}</p>}
            <button type="submit" disabled={resetting} className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-brand-foreground hover:bg-brand-hover disabled:opacity-60">
              {resetting ? '設定中…' : '設定新密碼'}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-brand-text hover:opacity-80">回到登入</Link>
        </p>
      </div>
    </div>
  )
}
