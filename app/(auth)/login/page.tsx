'use client'

import { useActionState, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { login } from '@/app/actions/auth'

function GoogleError() {
  const searchParams = useSearchParams()
  if (searchParams.get('error') !== 'google_failed') return null
  return (
    <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-500 dark:bg-rose-900/20">
      Google 登入失敗，請稍後再試
    </p>
  )
}

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

        {/* Google 登入 */}
        <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-card">
          <div className="relative flex items-center mb-3">
            <div className="grow border-t" />
            <span className="mx-3 text-xs text-muted-foreground">或</span>
            <div className="grow border-t" />
          </div>
          <Suspense>
            <GoogleError />
          </Suspense>
          <a
            href="/api/auth/google/redirect"
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border py-2.5 text-sm font-medium transition-colors hover:bg-muted/50 dark:hover:bg-muted/20"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            使用 Google 帳號登入
          </a>
        </div>

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
