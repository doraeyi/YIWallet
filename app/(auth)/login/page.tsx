'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { login } from '@/app/actions/auth'

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined)

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image src="/icons/logo.png" alt="易記帳" width={120} height={120} className="rounded-2xl shadow-lg" />
          <h1 className="text-2xl font-bold">易記帳</h1>
          <p className="text-sm text-muted-foreground">登入你的帳號</p>
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
                placeholder="輸入帳號"
                className="w-full rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-ring"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">密碼</label>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="輸入密碼"
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
              {pending ? '登入中…' : '登入'}
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          還沒有帳號？{' '}
          <Link href="/register" className="font-medium text-amber-500 hover:text-amber-600">
            註冊
          </Link>
        </p>
      </div>
    </div>
  )
}
