'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useNotifications }           from '@/hooks/useNotificationStore'
import { useRealtimeNotifications }   from '@/hooks/useRealtimeNotifications'
import { cn }                         from '@/lib/utils'
import type { RealtimeNotification, NotificationType } from '@/hooks/useRealtimeNotifications'

// ── 알림 타입별 아이콘 / 색상 ────────────────────────────────────
const TYPE_CONFIG: Record<NotificationType, { icon: string; color: string; bg: string }> = {
  new_order:    { icon: '🛒', color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
  order_cancel: { icon: '🚫', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  low_stock:    { icon: '⚠️', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  out_of_stock: { icon: '🚨', color: 'text-red-400',    bg: 'bg-red-500/10'    },
  new_member:   { icon: '👤', color: 'text-green-400',  bg: 'bg-green-500/10'  },
}

// 알림 → 관련 관리자 페이지 링크
function getLink(n: RealtimeNotification): string | null {
  if (n.type === 'new_order' || n.type === 'order_cancel')
    return n.payload.id ? `/admin/orders/${n.payload.id}` : '/admin/orders'
  if (n.type === 'low_stock' || n.type === 'out_of_stock')
    return n.payload.id ? `/admin/products` : '/admin/products'
  if (n.type === 'new_member')
    return '/admin/members'
  return null
}

function timeAgo(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000
  if (diff < 60)   return '방금'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return date.toLocaleDateString('ko-KR')
}

// ── 컴포넌트 ─────────────────────────────────────────────────────
export function NotificationBell() {
  const {
    items, unread, panelOpen,
    addNotification, markRead, markAllRead, removeNotification, clearAll,
    togglePanel, closePanel,
  } = useNotifications()

  const panelRef = useRef<HTMLDivElement>(null)

  // 실시간 구독
  useRealtimeNotifications({
    onNotification: addNotification,
    enabled:        true,
  })

  // 패널 외부 클릭 시 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closePanel()
      }
    }
    if (panelOpen) document.addEventListener('mousedown', handleClick)
    return ()  => document.removeEventListener('mousedown', handleClick)
  }, [panelOpen, closePanel])

  // ESC 키
  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') closePanel() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [closePanel])

  return (
    <div ref={panelRef} className="relative">
      {/* 벨 버튼 */}
      <button
        onClick={togglePanel}
        className={cn(
          'relative w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
          panelOpen ? 'bg-bg-3' : 'hover:bg-bg-3'
        )}
        aria-label={`알림 ${unread > 0 ? `(${unread}개 미읽음)` : ''}`}
      >
        {/* 벨 아이콘 */}
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={cn('transition-colors', unread > 0 ? 'text-accent' : 'text-ink-2')}
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>

        {/* 미읽음 뱃지 */}
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full
            bg-accent text-white text-[10px] font-bold flex items-center justify-center
            animate-in zoom-in-95 duration-150">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* 알림 패널 */}
      {panelOpen && (
        <div
          className="absolute right-0 top-10 w-80 rounded-xl border border-border-2
            bg-bg-2 shadow-2xl z-50 overflow-hidden
            animate-in fade-in zoom-in-95 duration-150"
          style={{ maxHeight: '70vh' }}
        >
          {/* 패널 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">알림</span>
              {unread > 0 && (
                <span className="text-[10px] font-bold bg-accent/15 text-accent px-1.5 py-0.5 rounded-full">
                  {unread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] text-ink-3 hover:text-accent transition-colors"
                >
                  모두 읽음
                </button>
              )}
              {items.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-[11px] text-ink-3 hover:text-red-400 transition-colors"
                >
                  전체 삭제
                </button>
              )}
            </div>
          </div>

          {/* 알림 목록 */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 48px)' }}>
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-ink-3">
                <span className="text-3xl mb-3">🔔</span>
                <p className="text-sm">새 알림이 없습니다</p>
                <p className="text-xs mt-1 text-ink-3">실시간으로 알림을 받고 있습니다</p>
              </div>
            ) : (
              <div>
                {items.map((n, idx) => {
                  const cfg  = TYPE_CONFIG[n.type]
                  const link = getLink(n)
                  const Wrap = link ? Link : 'div'

                  return (
                    <Wrap
                      key={n.id}
                      href={link ?? '#'}
                      onClick={() => { if (!n.read) markRead(n.id); closePanel() }}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer',
                        'border-b border-border last:border-0',
                        n.read ? 'hover:bg-bg-3/50' : 'bg-accent/[0.03] hover:bg-accent/[0.06]'
                      )}
                    >
                      {/* 아이콘 */}
                      <div className={cn(
                        'w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-sm mt-0.5',
                        cfg.bg
                      )}>
                        {cfg.icon}
                      </div>

                      {/* 내용 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            'text-xs font-semibold leading-tight',
                            n.read ? 'text-ink-2' : 'text-ink'
                          )}>
                            {n.title}
                          </p>
                          {!n.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-ink-3 mt-0.5 leading-relaxed truncate">
                          {n.body}
                        </p>
                        <p className="text-[10px] text-ink-3/70 mt-1">
                          {timeAgo(n.timestamp)}
                        </p>
                      </div>

                      {/* 삭제 버튼 */}
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); removeNotification(n.id) }}
                        className="opacity-0 group-hover:opacity-100 text-ink-3 hover:text-red-400
                          transition-all text-base leading-none flex-shrink-0 mt-0.5"
                        aria-label="알림 삭제"
                      >
                        ×
                      </button>
                    </Wrap>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
