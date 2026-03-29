'use client'
import { useEffect, useState } from 'react'

// BeforeInstallPrompt 이벤트 타입
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner,    setShowBanner]    = useState(false)
  const [isInstalled,   setIsInstalled]   = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    // Service Worker 등록
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(reg => {
        console.log('[PWA] Service Worker registered:', reg.scope)
      })
      .catch(err => console.error('[PWA] SW registration failed:', err))

    // 앱 설치 여부 확인
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // 설치 배너 이벤트 수신
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)

      // 이미 닫은 경우 스킵
      const dismissed = localStorage.getItem('pwa_install_dismissed')
      if (!dismissed) setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // 설치 완료 감지
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setShowBanner(false)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'dismissed') {
      localStorage.setItem('pwa_install_dismissed', String(Date.now()))
    }
    setShowBanner(false)
    setInstallPrompt(null)
  }

  return (
    <>
      {children}

      {/* 앱 설치 배너 (Android / Chrome) */}
      {showBanner && !isInstalled && (
        <div
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50
            rounded-2xl p-4 shadow-2xl flex items-center gap-3 shop-animate-up"
          style={{ background: 'var(--shop-ink)', color: 'var(--shop-bg)' }}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.1)' }}>
            📱
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">앱으로 설치하기</p>
            <p className="text-xs opacity-70">홈 화면에서 빠르게 접근하세요</p>
          </div>
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <button
              onClick={handleInstall}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold"
              style={{ background: 'var(--shop-bg)', color: 'var(--shop-ink)' }}
            >
              설치
            </button>
            <button
              onClick={() => { localStorage.setItem('pwa_install_dismissed', String(Date.now())); setShowBanner(false) }}
              className="text-xs px-3 py-1.5 rounded-lg opacity-60"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  )
}
