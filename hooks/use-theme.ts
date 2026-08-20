'use client'

import { useCallback, useEffect, useState } from 'react'

export type ThemePref = 'light' | 'dark' | 'system'

export const THEME_STORAGE_KEY = 'yiwallet_theme'

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(pref: ThemePref) {
  const isDark = pref === 'dark' || (pref === 'system' && systemPrefersDark())
  document.documentElement.classList.toggle('dark', isDark)
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePref>('system')

  useEffect(() => {
    const stored = (localStorage.getItem(THEME_STORAGE_KEY) as ThemePref | null) ?? 'system'
    setThemeState(stored)

    // 「跟隨系統」時，使用中如果系統主題切換（例如手機到了設定的夜間模式時間），
    // 要即時跟著變，不用重新整理頁面。
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystemChange = () => {
      const current = (localStorage.getItem(THEME_STORAGE_KEY) as ThemePref | null) ?? 'system'
      if (current === 'system') applyTheme('system')
    }
    mql.addEventListener('change', onSystemChange)
    return () => mql.removeEventListener('change', onSystemChange)
  }, [])

  const setTheme = useCallback((pref: ThemePref) => {
    localStorage.setItem(THEME_STORAGE_KEY, pref)
    setThemeState(pref)
    applyTheme(pref)
  }, [])

  return { theme, setTheme }
}
