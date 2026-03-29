'use client'
import { useState, useEffect, useCallback } from 'react'

export type PushPermission = 'default' | 'granted' | 'denied'

interface UsePushNotificationReturn {
  permission:    PushPermission
  isSubscribed:  boolean
  isSupported:   boolean
  isLoading:     boolean
  subscribe:     () => Promise<boolean>
  unsubscribe:   () => Promise<boolean>
}

// Base64 URL → Uint8Array 변환 (VAPID 공개키 변환용)
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding  = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData  = window.atob(base64)
  const arr      = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    arr[i] = rawData.charCodeAt(i)
  }
  return arr.buffer
}

export function usePushNotification(): UsePushNotificationReturn {
  const [permission,   setPermission]   = useState<PushPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading,    setIsLoading]    = useState(false)
  const [isSupported,  setIsSupported]  = useState(false)

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      setIsSupported(false)
      return
    }

    setIsSupported(true)
    setPermission(Notification.permission as PushPermission)

    // 현재 구독 상태 확인
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => {
        setIsSubscribed(!!sub)
      })
    )
  }, [])

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false
    setIsLoading(true)

    try {
      // 권한 요청
      const perm = await Notification.requestPermission()
      setPermission(perm as PushPermission)

      if (perm !== 'granted') {
        setIsLoading(false)
        return false
      }

      const reg = await navigator.serviceWorker.ready
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

      if (!vapidKey) throw new Error('NEXT_PUBLIC_VAPID_PUBLIC_KEY가 설정되지 않았습니다')

      // 푸시 구독 생성
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      // 서버에 등록
      const keys = subscription.toJSON().keys as { p256dh: string; auth: string }
      const res  = await fetch('/api/push/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys,
          },
          action: 'subscribe',
        }),
      })

      if (!res.ok) throw new Error('서버 구독 등록 실패')

      setIsSubscribed(true)
      setIsLoading(false)
      return true
    } catch (err) {
      console.error('[usePushNotification] subscribe error:', err)
      setIsLoading(false)
      return false
    }
  }, [isSupported])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()

      if (sub) {
        // 서버에서 먼저 비활성화
        await fetch('/api/push/subscribe', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            subscription: { endpoint: sub.endpoint, keys: sub.toJSON().keys },
            action: 'unsubscribe',
          }),
        })
        // 브라우저에서 구독 해제
        await sub.unsubscribe()
      }

      setIsSubscribed(false)
      setIsLoading(false)
      return true
    } catch (err) {
      console.error('[usePushNotification] unsubscribe error:', err)
      setIsLoading(false)
      return false
    }
  }, [])

  return { permission, isSubscribed, isSupported, isLoading, subscribe, unsubscribe }
}
