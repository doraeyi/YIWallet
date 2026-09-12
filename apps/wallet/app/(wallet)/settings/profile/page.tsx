'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeftIcon, CheckIcon, EyeIcon, EyeOffIcon, CameraIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserProfile {
  id: string
  username?: string
  email?: string
  name?: string
  picture?: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 大頭照上傳
  const [avatarUploading, setAvatarUploading] = useState(false)

  function resizeImage(file: File, size: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!
        const side = Math.min(img.width, img.height)
        const sx = (img.width - side) / 2
        const sy = (img.height - side) / 2
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('圖片載入失敗')) }
      img.src = url
    })
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { alert('圖片大小不能超過 10MB'); return }

    setAvatarUploading(true)
    try {
      const dataUrl = await resizeImage(file, 200)
      const res = await fetch('/api/backend/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ picture: dataUrl }),
      })
      if (res.ok) {
        setProfile(prev => prev ? { ...prev, picture: dataUrl } : prev)
      } else {
        alert('上傳失敗，請稍後再試')
      }
    } catch {
      alert('圖片處理失敗，請換一張試試')
    } finally {
      setAvatarUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // 名稱
  const [name, setName] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)

  // 密碼
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)

  // Google 狀態
  const [googleLinked, setGoogleLinked] = useState<boolean | null>(null)
  const [googleProfile, setGoogleProfile] = useState<{ name?: string; picture?: string } | null>(null)
  const [hasPassword, setHasPassword] = useState<boolean | null>(null)
  const [applyingGoogle, setApplyingGoogle] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/backend/users/me').then(r => r.ok ? r.json() : null),
      fetch('/api/backend/users/me/google').then(r => r.json()).catch(() => ({ linked: false })),
      fetch('/api/backend/users/me/has-password').then(r => r.json()).catch(() => ({ has_password: true })),
    ]).then(([me, google, pw]) => {
      if (me) {
        setProfile(me)
        setName(me.name || me.username || '')
      }
      setGoogleLinked(google.linked)
      if (google.linked && (google.name || google.picture)) {
        setGoogleProfile({ name: google.name, picture: google.picture })
      }
      setHasPassword(pw.has_password ?? true)
      setIsLoaded(true)
    })
  }, [])

  async function handleApplyGoogle() {
    if (!googleProfile) return
    setApplyingGoogle(true)
    try {
      const res = await fetch('/api/backend/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: googleProfile.name, picture: googleProfile.picture }),
      })
      if (res.ok) {
        setProfile(prev => prev ? { ...prev, name: googleProfile.name, picture: googleProfile.picture } : prev)
        if (googleProfile.name) setName(googleProfile.name)
      }
    } finally {
      setApplyingGoogle(false)
    }
  }

  async function handleSaveName() {
    if (!name.trim()) return
    setNameSaving(true)
    try {
      const res = await fetch('/api/backend/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (res.ok) {
        setProfile(prev => prev ? { ...prev, name: name.trim() } : prev)
        setNameSaved(true)
        setTimeout(() => setNameSaved(false), 2000)
      }
    } finally {
      setNameSaving(false)
    }
  }

  async function handleChangePassword() {
    setPwError('')
    if (newPw.length < 6) { setPwError('新密碼至少需要 6 個字元'); return }
    if (newPw !== confirmPw) { setPwError('新密碼與確認密碼不一致'); return }
    setPwSaving(true)
    try {
      const res = await fetch('/api/backend/users/me/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      })
      if (res.ok) {
        setPwSaved(true)
        setCurrentPw('')
        setNewPw('')
        setConfirmPw('')
        setTimeout(() => setPwSaved(false), 2000)
      } else {
        const data = await res.json().catch(() => ({}))
        setPwError(data.detail || '密碼修改失敗，請確認目前密碼是否正確')
      }
    } finally {
      setPwSaving(false)
    }
  }

  const displayName = profile?.name || profile?.username || profile?.email?.split('@')[0] || '使用者'
  const avatarLetter = displayName.charAt(0).toUpperCase()

  if (!isLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-amber-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-10 pb-4 lg:pt-8">
        <button
          onClick={() => router.back()}
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <ChevronLeftIcon className="size-5" />
        </button>
        <h1 className="text-lg font-bold">個人資料</h1>
      </div>

      <div className="flex flex-col gap-4 px-4 pb-8 lg:max-w-lg lg:px-6">

        {/* 頭像 */}
        <div className="flex flex-col items-center py-4 gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            className="relative size-24"
          >
            {profile?.picture ? (
              <img
                src={profile.picture}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="size-24 rounded-full object-cover ring-4 ring-white shadow-md dark:ring-card"
              />
            ) : (
              <div className="flex size-24 items-center justify-center rounded-full bg-amber-400 text-4xl font-bold text-white ring-4 ring-white shadow-md dark:ring-card">
                {avatarLetter}
              </div>
            )}
            {/* 相機覆蓋層 */}
            <div className={cn(
              'absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full bg-white shadow-md border border-muted dark:bg-card',
              avatarUploading && 'opacity-60'
            )}>
              {avatarUploading
                ? <div className="size-4 animate-spin rounded-full border-2 border-muted border-t-amber-400" />
                : <CameraIcon className="size-4 text-muted-foreground" />
              }
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <p className="text-base font-semibold">{displayName}</p>
          {profile?.email && <p className="text-xs text-muted-foreground">{profile.email}</p>}
        </div>

        {/* 名稱設定 */}
        <p className="px-1 text-xs font-medium text-muted-foreground">基本資料</p>
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold">顯示名稱</p>
          </div>
          <div className="px-4 py-4 flex flex-col gap-3">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
              placeholder="輸入你的名稱"
              className="w-full rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-amber-400"
            />
            <button
              onClick={handleSaveName}
              disabled={nameSaving || !name.trim()}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
            >
              {nameSaved ? <><CheckIcon className="size-4" />已儲存</> : nameSaving ? '儲存中…' : '儲存名稱'}
            </button>
          </div>
        </div>

        {/* 密碼修改 */}
        {hasPassword !== false && (
          <>
            <p className="px-1 text-xs font-medium text-muted-foreground">安全性</p>
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
              <div className="border-b px-4 py-3">
                <p className="text-sm font-semibold">修改密碼</p>
              </div>
              <div className="px-4 py-4 flex flex-col gap-3">
                {/* 目前密碼 */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">目前密碼</label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      value={currentPw}
                      onChange={e => setCurrentPw(e.target.value)}
                      placeholder="輸入目前密碼"
                      className="w-full rounded-xl border bg-muted/30 px-3 py-2.5 pr-10 text-sm outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showCurrentPw ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* 新密碼 */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">新密碼</label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPw}
                      onChange={e => setNewPw(e.target.value)}
                      placeholder="至少 6 個字元"
                      className="w-full rounded-xl border bg-muted/30 px-3 py-2.5 pr-10 text-sm outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showNewPw ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* 確認新密碼 */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">確認新密碼</label>
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    placeholder="再輸入一次新密碼"
                    className={cn(
                      'w-full rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-amber-400',
                      confirmPw && newPw !== confirmPw && 'border-rose-400'
                    )}
                  />
                </div>

                {pwError && <p className="text-xs text-rose-500">{pwError}</p>}

                <button
                  onClick={handleChangePassword}
                  disabled={pwSaving || !currentPw || !newPw || !confirmPw}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
                >
                  {pwSaved ? <><CheckIcon className="size-4" />密碼已更新</> : pwSaving ? '更新中…' : '更新密碼'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Google 登入提示 */}
        {googleLinked && hasPassword === false && (
          <>
            <p className="px-1 text-xs font-medium text-muted-foreground">安全性</p>
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
              <div className="px-4 py-4">
                <p className="text-sm font-medium">你使用 Google 帳號登入</p>
                <p className="mt-1 text-xs text-muted-foreground">帳號安全性由 Google 管理，無需另外設定密碼。</p>
              </div>
            </div>
          </>
        )}

        {/* Google 帳號資料 — 放最下面 */}
        {googleLinked && googleProfile && (
          <>
            <p className="px-1 text-xs font-medium text-muted-foreground">Google 帳號</p>
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
              <div className="flex items-center gap-3 px-4 py-4">
                {googleProfile.picture ? (
                  <img
                    src={googleProfile.picture}
                    alt={googleProfile.name}
                    referrerPolicy="no-referrer"
                    className="size-12 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-amber-400 text-lg font-bold text-white">
                    {googleProfile.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{googleProfile.name}</p>
                  <p className="text-xs text-muted-foreground">Google 帳號</p>
                </div>
              </div>
              <button
                onClick={handleApplyGoogle}
                disabled={applyingGoogle}
                className="flex w-full items-center justify-center border-t py-3 text-sm font-medium text-amber-500 hover:bg-amber-50 disabled:opacity-60 dark:hover:bg-amber-950/20"
              >
                {applyingGoogle ? '套用中…' : '套用 Google 帳號的名稱和大頭照'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
