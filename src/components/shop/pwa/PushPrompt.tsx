'use client'
import { useState, useEffect } from 'react'
import { usePushNotification } from '@/hooks/usePushNotification'

// 마지막 거부 후 7일 뒤 다시 표시
const DISMISS_KEY    = 'push_prompt_dismissed'
const DISMISS_DAYS   = 7

export function PushPrompt() {
  const { isSupported, isSubscribed, permission, subscribe, isLoading } = usePushNotification()
  const [visible,  setVisible]  = useState(false)
  const [success,  setSuccess]  = useState(false)

  useEffect(() => {
    if (!isSupported || isSubscribed || permission === 'denied') return

    // 이미 거부한 경우 기간 체크
    const dismissed = localStorage.getItem(DISMISS_KEY)
    if (dismissed) {
      const daysPassed = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24)
      if (daysPassed < DISMISS_DAYS) return
    }

    // 페이지 로드 후 3초 뒤 표시
    const timer = setTimeout(() => setVisible(true), 3000)
    return () => clearTimeout(timer)
  }, [isSupported, isSubscribed, permission])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  async function handleSubscribe() {
    const ok = await subscribe()
    if (ok) {
      setSuccess(true)
      setTimeout(() => setVisible(false), 2500)
    } else {
      dismiss()
    }
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50
        rounded-2xl p-4 shadow-2xl border shop-animate-up"
      style={{ background: 'var(--shop-bg)', borderColor: 'var(--shop-border)' }}
    >
      {success ? (
        <div className="text-center py-2">
          <p className="text-2xl mb-1">🔔</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--shop-ink)' }}>
            알림이 활성화되었습니다!
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--shop-ink3)' }}>
            주문 배송 알림을 받을 수 있습니다
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3 mb-4">
            <span className="text-2xl flex-shrink-0">🛍️</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--shop-ink)' }}>
                알림을 받아보세요
              </p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--shop-ink3)' }}>
                주문 배송 현황, 특가 쿠폰 등 중요한 알림을 놓치지 마세요
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSubscribe}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-1.5"
              style={{ background: 'var(--shop-ink)', color: 'white' }}
            >
              {isLoading
                ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : null}
              {isLoading ? '처리 중...' : '알림 받기'}
            </button>
            <button
              onClick={dismiss}
              className="px-4 py-2.5 rounded-xl text-sm transition-all"
              style={{ background: 'var(--shop-bg2)', color: 'var(--shop-ink3)' }}
            >
              나중에
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── 설정 페이지용 토글 컴포넌트 ──────────────────────────────────
export function PushSettingsToggle() {
  const { isSupported, isSubscribed, permission, subscribe, unsubscribe, isLoading } = usePushNotification()

  if (!isSupported) return (
    <p className="text-sm" style={{ color: 'var(--shop-ink3)' }}>이 브라우저는 푸시 알림을 지원하지 않습니다</p>
  )

  if (permission === 'denied') return (
    <div className="text-sm" style={{ color: 'var(--shop-ink3)' }}>
      <p>푸시 알림이 차단되었습니다.</p>
      <p className="text-xs mt-1">브라우저 주소창 옆 자물쇠 아이콘 → 알림 → 허용으로 변경해 주세요.</p>
    </div>
  )

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--shop-ink)' }}>푸시 알림</p>
        <p className="text-xs" style={{ color: 'var(--shop-ink3)' }}>
          {isSubscribed ? '주문 및 마케팅 알림 수신 중' : '알림이 꺼져 있습니다'}
        </p>
      </div>
      <button
        onClick={isSubscribed ? unsubscribe : subscribe}
        disabled={isLoading}
        className="w-12 h-6 rounded-full transition-colors relative disabled:opacity-60"
        style={{ background: isSubscribed ? 'var(--shop-ink)' : 'var(--shop-bg3)' }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: isSubscribed ? 'translateX(26px)' : 'translateX(2px)' }}
        />
      </button>
    </div>
  )
}
