'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient }             from '@/lib/supabase/client'
import { useNotifications }         from '@/hooks/useNotificationStore'
import { cn }                       from '@/lib/utils'
import { formatPrice, formatDateTime } from '@/lib/utils'
import type { RealtimeNotification } from '@/hooks/useRealtimeNotifications'

// 최근 주문 실시간 행 컴포넌트
function LiveOrderRow({
  order,
  isNew,
}: {
  order: Record<string, unknown>
  isNew: boolean
}) {
  const STATUS_LABEL: Record<string, string> = {
    pending: '결제대기', paid: '결제완료', shipping: '배송중',
    delivered: '배송완료', returned: '반품요청', cancelled: '취소',
  }
  const STATUS_COLOR: Record<string, string> = {
    pending:   'text-ink-3',
    paid:      'text-accent',
    shipping:  'text-yellow-400',
    delivered: 'text-green-400',
    returned:  'text-red-400',
    cancelled: 'text-ink-3',
  }

  return (
    <Link
      href={`/admin/orders/${order.id}`}
      className={cn(
        'flex items-center gap-3 px-4 py-3 border-b border-border last:border-0',
        'hover:bg-white/[0.02] transition-colors',
        isNew && 'bg-accent/[0.04]'
      )}
    >
      {isNew && (
        <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 animate-pulse" />
      )}
      <div className="flex-1 min-w-0">
        <span className="text-xs font-mono text-accent">{String(order.order_no ?? '')}</span>
      </div>
      <span className="text-xs font-mono font-medium text-ink">
        {formatPrice(Number(order.total_amount ?? 0))}
      </span>
      <span className={cn('text-[11px] font-medium', STATUS_COLOR[String(order.status ?? '')] ?? 'text-ink-3')}>
        {STATUS_LABEL[String(order.status ?? '')] ?? order.status}
      </span>
      <span className="text-[10px] text-ink-3 hidden sm:block">
        {formatDateTime(String(order.created_at ?? ''))}
      </span>
    </Link>
  )
}

// ── 실시간 주문 피드 ──────────────────────────────────────────────
export function DashboardLiveFeed() {
  const [recentOrders, setRecentOrders] = useState<Record<string, unknown>[]>([])
  const [newOrderIds, setNewOrderIds]   = useState<Set<string>>(new Set())
  const [loading, setLoading]           = useState(true)
  const { items: notifications }        = useNotifications()

  // 초기 데이터 로드
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('orders')
      .select('id, order_no, total_amount, status, created_at')
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data }) => {
        setRecentOrders(data ?? [])
        setLoading(false)
      })
  }, [])

  // 새 주문 알림이 들어오면 목록 상단에 추가
  useEffect(() => {
    const latestNewOrder = notifications.find(n => n.type === 'new_order')
    if (!latestNewOrder) return

    const orderId = String(latestNewOrder.payload.id ?? '')
    if (!orderId) return

    // 이미 있으면 스킵
    if (recentOrders.some(o => o.id === orderId)) return

    setRecentOrders(prev => [latestNewOrder.payload, ...prev].slice(0, 8))
    setNewOrderIds(prev => new Set(Array.from(prev).concat(orderId)))

    // 5초 후 "새 주문" 하이라이트 제거
    setTimeout(() => {
      setNewOrderIds(prev => { const n = new Set(prev); n.delete(orderId); return n })
    }, 5000)
  }, [notifications, recentOrders])

  return (
    <div className="bg-bg-2 border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ink-2 uppercase tracking-wide">
            실시간 주문
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        </div>
        <Link href="/admin/orders" className="text-[11px] text-ink-3 hover:text-accent transition-colors">
          전체 보기 →
        </Link>
      </div>

      {loading ? (
        <div className="space-y-px">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 px-4 py-3 border-b border-border">
              {[100, 60, 50, 80].map((w, j) => (
                <div key={j} className="h-3 rounded animate-pulse bg-bg-3" style={{ width: w }} />
              ))}
            </div>
          ))}
        </div>
      ) : recentOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-ink-3">
          <span className="text-3xl mb-2">📭</span>
          <p className="text-sm">주문이 없습니다</p>
        </div>
      ) : (
        recentOrders.map(order => (
          <LiveOrderRow
            key={String(order.id ?? '')}
            order={order}
            isNew={newOrderIds.has(String(order.id ?? ''))}
          />
        ))
      )}
    </div>
  )
}

// ── 실시간 알림 미니 피드 (대시보드 사이드바용) ───────────────────
export function RecentNotificationsFeed() {
  const { items, markRead, panelOpen } = useNotifications()
  const recent = items.slice(0, 5)

  const TYPE_ICON: Record<string, string> = {
    new_order: '🛒', order_cancel: '🚫',
    low_stock: '⚠️', out_of_stock: '🚨', new_member: '👤',
  }

  return (
    <div className="bg-bg-2 border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <span className="text-xs font-semibold text-ink-2 uppercase tracking-wide">
          최근 알림
        </span>
      </div>
      {recent.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-ink-3 text-xs">
          새 알림이 없습니다
        </div>
      ) : (
        recent.map(n => (
          <div
            key={n.id}
            onClick={() => markRead(n.id)}
            className={cn(
              'flex items-start gap-3 px-4 py-2.5 border-b border-border last:border-0',
              'cursor-pointer hover:bg-white/[0.02] transition-colors',
              !n.read && 'bg-accent/[0.03]'
            )}
          >
            <span className="text-sm flex-shrink-0 mt-0.5">{TYPE_ICON[n.type] ?? '🔔'}</span>
            <div className="flex-1 min-w-0">
              <p className={cn('text-xs leading-tight', n.read ? 'text-ink-3' : 'text-ink font-medium')}>
                {n.title}
              </p>
              <p className="text-[11px] text-ink-3 truncate mt-0.5">{n.body}</p>
            </div>
            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-1.5" />}
          </div>
        ))
      )}
    </div>
  )
}
