'use client'
import { useEffect, useState, useCallback } from 'react'
import { useNotifications }        from '@/hooks/useNotificationStore'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { cn }                       from '@/lib/utils'
import type { RealtimeNotification, NotificationType } from '@/hooks/useRealtimeNotifications'

const TOAST_DURATION = 5000   // 5초 후 자동 닫힘
const MAX_TOASTS     = 3      // 동시에 최대 3개 표시

const TYPE_STYLES: Record<NotificationType, { border: string; icon: string }> = {
  new_order:    { border: 'border-l-blue-400',   icon: '🛒' },
  order_cancel: { border: 'border-l-yellow-400', icon: '🚫' },
  low_stock:    { border: 'border-l-yellow-400', icon: '⚠️' },
  out_of_stock: { border: 'border-l-red-400',    icon: '🚨' },
  new_member:   { border: 'border-l-green-400',  icon: '👤' },
}

interface ToastItem extends RealtimeNotification {
  exiting: boolean
}

export function ToastNotifications() {
  const { addNotification } = useNotifications()
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const handleNew = useCallback((n: RealtimeNotification) => {
    // 알림 스토어에도 추가
    addNotification(n)

    // 토스트 큐에 추가
    setToasts(prev => {
      const next = [{ ...n, exiting: false }, ...prev].slice(0, MAX_TOASTS)
      return next
    })

    // 자동 닫힘 타이머
    setTimeout(() => {
      setToasts(prev =>
        prev.map(t => t.id === n.id ? { ...t, exiting: true } : t)
      )
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== n.id))
      }, 300)  // exit 애니메이션 후 제거
    }, TOAST_DURATION)
  }, [addNotification])

  useRealtimeNotifications({
    onNotification: handleNew,
    enabled:        true,
  })

  function dismiss(id: string) {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300)
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast, idx) => {
        const style = TYPE_STYLES[toast.type]
        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto w-72 rounded-xl border border-border-2 border-l-4 bg-bg-2',
              'shadow-2xl px-4 py-3 flex items-start gap-3',
              'transition-all duration-300',
              style.border,
              toast.exiting
                ? 'opacity-0 translate-x-4 scale-95'
                : 'opacity-100 translate-x-0 scale-100'
            )}
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            {/* 아이콘 */}
            <span className="text-base flex-shrink-0 mt-0.5">{style.icon}</span>

            {/* 내용 */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-ink leading-tight">{toast.title}</p>
              <p className="text-xs text-ink-3 mt-0.5 leading-relaxed truncate">{toast.body}</p>
            </div>

            {/* 닫기 */}
            <button
              onClick={() => dismiss(toast.id)}
              className="text-ink-3 hover:text-ink transition-colors text-base leading-none flex-shrink-0 mt-0.5"
              aria-label="닫기"
            >
              ×
            </button>

            {/* 진행 바 */}
            <div
              className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full origin-left"
              style={{
                background:  'var(--accent)',
                opacity:     0.4,
                animation:   `shrink ${TOAST_DURATION}ms linear forwards`,
              }}
            />
          </div>
        )
      })}

      <style>{`
        @keyframes shrink {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  )
}
