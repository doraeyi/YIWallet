'use server'

import { redirect } from 'next/navigation'
import { createSession, deleteSession } from '@/lib/session'

export async function login(_state: unknown, formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  let res: Response
  try {
    res = await fetch(`${process.env.API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
  } catch {
    return { error: '無法連線到伺服器' }
  }

  if (!res.ok) {
    return { error: '帳號或密碼錯誤' }
  }

  const { token, user } = await res.json()
  await createSession(token, String(user?.id ?? user?.username ?? username))
  redirect('/dashboard')
}

export async function register(_state: unknown, formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string
  const confirm  = formData.get('confirm') as string

  if (password !== confirm) return { error: '兩次密碼不一致' }
  if (password.length < 6)  return { error: '密碼至少 6 個字元' }

  let res: Response
  try {
    res = await fetch(`${process.env.API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
  } catch {
    return { error: '無法連線到伺服器' }
  }

  if (res.status === 400) return { error: '此帳號已被使用' }
  if (!res.ok)            return { error: '註冊失敗，請稍後再試' }

  const { token, user } = await res.json()
  await createSession(token, String(user?.id ?? username))
  redirect('/dashboard')
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}
