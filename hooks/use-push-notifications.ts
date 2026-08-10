'use client'

import { useCallback, useEffect, useState } from 'react'
import { getToken, deleteToken, onMessage } from 'firebase/messaging'
import { getFirebaseMessaging } from '@/lib/firebase'

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
const STORAGE_KEY = 'push-notifications-enabled'

type PermissionStatus = 'unsupported' | 'default' | 'granted' | 'denied'

export function usePushNotifications() {
  const [permission, setPermission] = useState<PermissionStatus>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      setPermission('unsupported')
      return
    }
    setPermission(Notification.permission as PermissionStatus)
    setSubscribed(Notification.permission === 'granted' && localStorage.getItem(STORAGE_KEY) === '1')
  }, [])

  // 前景（分頁開啟且聚焦）收到推播時，手動顯示通知
  useEffect(() => {
    let active = true
    let unsubscribe: (() => void) | undefined
    getFirebaseMessaging().then(messaging => {
      if (!active || !messaging) return
      unsubscribe = onMessage(messaging, payload => {
        const title = payload.notification?.title ?? '易記帳'
        const body = payload.notification?.body
        new Notification(title, { body, icon: '/icons/icon-192x192.png' })
      })
    })
    return () => { active = false; unsubscribe?.() }
  }, [])

  const enable = useCallback(async () => {
    if (!VAPID_KEY) {
      console.error('缺少 NEXT_PUBLIC_FIREBASE_VAPID_KEY 環境變數')
      return false
    }
    setLoading(true)
    try {
      const result = await Notification.requestPermission()
      setPermission(result as PermissionStatus)
      if (result !== 'granted') return false

      const messaging = await getFirebaseMessaging()
      if (!messaging) return false

      const registration = await navigator.serviceWorker.ready
      const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration })
      if (!token) return false

      const res = await fetch('/api/backend/users/me/fcm-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!res.ok) return false

      localStorage.setItem(STORAGE_KEY, '1')
      setSubscribed(true)
      return true
    } finally {
      setLoading(false)
    }
  }, [])

  const disable = useCallback(async () => {
    setLoading(true)
    try {
      const messaging = await getFirebaseMessaging()
      if (messaging && VAPID_KEY) {
        const registration = await navigator.serviceWorker.ready
        const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration }).catch(() => null)
        if (token) {
          await fetch('/api/backend/users/me/fcm-token', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          }).catch(() => {})
          await deleteToken(messaging).catch(() => {})
        }
      }
      localStorage.removeItem(STORAGE_KEY)
      setSubscribed(false)
    } finally {
      setLoading(false)
    }
  }, [])

  return { permission, subscribed, loading, enable, disable }
}
