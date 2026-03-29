'use client'
import { useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ── 알림 타입 ─────────────────────────────────────────────────────
export type NotificationType =
  | 'new_order'      // 신규 주문
  | 'order_cancel'   // 주문 취소
  | 'low_stock'      // 재고 부족
  | 'out_of_stock'   // 재고 소진
  | 'new_member'     // 신규 회원가입

export interface RealtimeNotification {
  id:        string
  type:      NotificationType
  title:     string
  body:      string
  payload:   Record<string, unknown>
  timestamp: Date
  read:      boolean
}

interface UseRealtimeNotificationsOptions {
  onNotification: (n: RealtimeNotification) => void
  enabled?:       boolean
}

// ── 알림 생성 헬퍼 ────────────────────────────────────────────────
function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function buildNotification(
  type:    NotificationType,
  payload: Record<string, unknown>
): RealtimeNotification {
  const templates: Record<NotificationType, (p: Record<string, unknown>) => { title: string; body: string }> = {
    new_order:    p => ({
      title: '신규 주문',
      body:  `${p.order_no} — ${Number(p.total_amount ?? 0).toLocaleString()}원`,
    }),
    order_cancel: p => ({
      title: '주문 취소',
      body:  `${p.order_no} 주문이 취소되었습니다`,
    }),
    low_stock:    p => ({
      title: '재고 부족 ⚠️',
      body:  `${p.name} — 남은 재고 ${p.stock}개`,
    }),
    out_of_stock: p => ({
      title: '품절 발생 🚨',
      body:  `${p.name} 상품이 품절되었습니다`,
    }),
    new_member:   p => ({
      title: '신규 회원가입',
      body:  `${p.email} 님이 가입했습니다`,
    }),
  }

  const { title, body } = templates[type](payload)
  return { id: makeId(), type, title, body, payload, timestamp: new Date(), read: false }
}

// ── 훅 ─────────────────────────────────────────────────────────────
export function useRealtimeNotifications({
  onNotification,
  enabled = true,
}: UseRealtimeNotificationsOptions) {
  const channelsRef = useRef<RealtimeChannel[]>([])
  const cbRef       = useRef(onNotification)
  cbRef.current     = onNotification   // 항상 최신 콜백 유지

  useEffect(() => {
    if (!enabled) return

    const supabase = createClient()

    // ── 주문 채널 ──────────────────────────────────────────────────
    const orderChannel = supabase
      .channel('admin-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        payload => {
          cbRef.current(buildNotification('new_order', payload.new as Record<string, unknown>))
        }
      )
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'orders',
          filter: 'status=eq.cancelled',
        },
        payload => {
          cbRef.current(buildNotification('order_cancel', payload.new as Record<string, unknown>))
        }
      )
      .subscribe()

    // ── 상품 채널 (재고 변동) ──────────────────────────────────────
    const productChannel = supabase
      .channel('admin-products')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        payload => {
          const n = payload.new as Record<string, unknown>
          const o = payload.old as Record<string, unknown>

          // 재고 소진 (재고가 생겼다가 0으로 변경)
          if (n.stock === 0 && Number(o.stock ?? 0) > 0) {
            cbRef.current(buildNotification('out_of_stock', n))
            return
          }
          // 재고 부족 (5개 이하, 이전에는 6개 이상)
          if (
            Number(n.stock ?? 0) > 0 &&
            Number(n.stock ?? 0) <= 5 &&
            Number(o.stock ?? 999) > 5
          ) {
            cbRef.current(buildNotification('low_stock', n))
          }
        }
      )
      .subscribe()

    // ── 회원 채널 ──────────────────────────────────────────────────
    const memberChannel = supabase
      .channel('admin-members')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'members' },
        payload => {
          cbRef.current(buildNotification('new_member', payload.new as Record<string, unknown>))
        }
      )
      .subscribe()

    channelsRef.current = [orderChannel, productChannel, memberChannel]

    return () => {
      channelsRef.current.forEach(ch => supabase.removeChannel(ch))
      channelsRef.current = []
    }
  }, [enabled])
}
