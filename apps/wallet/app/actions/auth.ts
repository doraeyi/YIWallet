'use server'

import { redirect } from 'next/navigation'
import { createSession, deleteSession } from '@/lib/session'
import { resolveReturnTo } from '@yiwallet/auth/return-to'

export async function login(_state: unknown, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const returnTo = formData.get('return_to') as string | null

  let res: Response
  try {
    res = await fetch(`${process.env.API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  } catch {
    return { error: '無法連線到伺服器' }
  }

  if (!res.ok) {
    return { error: '帳號或密碼錯誤' }
  }

  const { access_token: token, user } = await res.json()
  await createSession(token, String(user?.id ?? email))
  redirect(resolveReturnTo(returnTo))
}

export async function register(_state: unknown, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirm  = formData.get('confirm') as string

  if (password !== confirm) return { error: '兩次密碼不一致' }
  if (password.length < 6)  return { error: '密碼至少 6 個字元' }

  let res: Response
  try {
    res = await fetch(`${process.env.API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, display_name: email.split('@')[0] }),
    })
  } catch {
    return { error: '無法連線到伺服器' }
  }

  if (res.status === 400) return { error: '此帳號已被使用' }
  if (!res.ok)            return { error: '註冊失敗，請稍後再試' }

  const { access_token: token, user } = await res.json()
  await createSession(token, String(user?.id ?? email))
  redirect('/dashboard')
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}

// 忘記密碼：後端寄 6 位數驗證碼到信箱（10 分鐘內有效），再用驗證碼設定新密碼
export async function requestPasswordReset(
  _state: unknown, formData: FormData,
): Promise<{ error?: string; sentTo?: string }> {
  const email = (formData.get('email') as string)?.trim()
  if (!email) return { error: '請輸入 Email' }
  try {
    const res = await fetch(`${process.env.API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (res.status === 422) return { error: 'Email 格式不正確' }
    if (!res.ok) return { error: '寄送驗證碼失敗，請稍後再試' }
  } catch {
    return { error: '無法連線到伺服器' }
  }
  return { sentTo: email }
}

export async function resetPassword(
  _state: unknown, formData: FormData,
): Promise<{ error?: string; sentTo?: string }> {
  const email = formData.get('email') as string
  const code = (formData.get('code') as string)?.trim()
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string
  if (password !== confirm) return { error: '兩次密碼不一致', sentTo: email }
  if (password.length < 6) return { error: '密碼至少 6 個字元', sentTo: email }
  try {
    const res = await fetch(`${process.env.API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, new_password: password }),
    })
    if (res.status === 400) return { error: '驗證碼錯誤或已過期', sentTo: email }
    if (!res.ok) return { error: '重設失敗，請稍後再試', sentTo: email }
  } catch {
    return { error: '無法連線到伺服器', sentTo: email }
  }
  redirect('/login?reset=1')
}
