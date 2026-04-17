'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { WalletIcon } from 'lucide-react'
import { register } from '@/app/actions/auth'

export default function RegisterPage() {
  const [state, action, pending] = useActionState(register, undefined)

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-amber-400 text-white shadow-lg shadow-amber-400/30">
            <WalletIcon className="size-7" strokeWidth={2.5} />
          </span>
          <h1 className="text-2xl font-bold">易記帳</h1>
          <p className="text-sm text-muted-foreground">建立新帳號</p>
        </div>

        <form action={action} className="rounded-2xl bg-white p-6 shadow-sm dark:bg-card">
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">帳號</label>
              <input
                name="username"
                type="text"
                required
                autoComplete="username"
                placeholder="設定帳號"
                className="w-full rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-ring"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">密碼</label>
              <input
                name="password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="至少 6 個字元"
                className="w-full rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-ring"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">確認密碼</label>
              <input
                name="confirm"
                type="password"
                required
                autoComplete="new-password"
                placeholder="再輸入一次密碼"
                className="w-full rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-ring"
              />
            </div>
            {state?.error && (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-500">{state.error}</p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="mt-1 w-full rounded-xl bg-amber-400 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60 hover:bg-amber-500"
            >
              {pending ? '註冊中…' : '註冊'}
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          已有帳號？{' '}
          <Link href="/login" className="font-medium text-amber-500 hover:text-amber-600">
            登入
          </Link>
        </p>
      </div>
    </div>
  )
}
