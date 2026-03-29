'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { ORDER_STATUS_LABEL, ORDER_STATUS_VARIANT } from '@/types/order'
import { formatPrice, formatDate } from '@/lib/utils'
import type { OrderStatus } from '@/types/order'

interface OrderSummary {
  id:               string
  order_no:         string
  status:           OrderStatus
  total_amount:     number
  coupon_discount:  number
  point_used:       number
  created_at:       string
  paid_at:          string | null
  items: Array<{ product_name: string; quantity: number; unit_price: number; sale_price: number | null }>
}

export function MemberOrderHistory({ memberId }: { memberId: string }) {
  const [orders, setOrders]   = useState<OrderSummary[]>([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/members/${memberId}/orders?page=${page}`)
      .then(r => r.json())
      .then(json => {
        setOrders(json.data ?? [])
        setTotal(json.total ?? 0)
      })
      .finally(() => setLoading(false))
  }, [memberId, page])

  if (loading) return (
    <div className="space-y-2">
      {[1,2,3].map(i => <div key={i} className="h-16 bg-bg-3 rounded-xl animate-pulse" />)}
    </div>
  )

  if (orders.length === 0) return (
    <div className="text-center py-8 text-ink-3">
      <p className="text-2xl mb-2">📦</p>
      <p className="text-sm">주문 이력이 없습니다</p>
    </div>
  )

  const totalPages = Math.ceil(total / 10)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-ink-3">총 {total}건</span>
      </div>

      <div className="space-y-2">
        {orders.map(order => (
          <div key={order.id} className="rounded-xl overflow-hidden border border-border">
            {/* 주문 헤더 */}
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-bg-3 transition-colors"
              onClick={() => setExpanded(expanded === order.id ? null : order.id)}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-accent">{order.order_no}</span>
                <Badge variant={ORDER_STATUS_VARIANT[order.status]}>
                  {ORDER_STATUS_LABEL[order.status]}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold text-ink">
                  {formatPrice(order.total_amount)}
                </span>
                <span className="text-[11px] font-mono text-ink-3">{formatDate(order.created_at)}</span>
                <span className="text-ink-3 text-xs">{expanded === order.id ? '▲' : '▼'}</span>
              </div>
            </div>

            {/* 주문 상품 펼치기 */}
            {expanded === order.id && (
              <div className="border-t border-border bg-bg-3/50 px-4 py-3">
                <div className="space-y-2 mb-3">
                  {order.items.map((item, i) => {
                    const price = item.sale_price ?? item.unit_price
                    return (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-ink-2 line-clamp-1">{item.product_name}</span>
                        <span className="text-ink-3 text-xs ml-2 flex-shrink-0">
                          {formatPrice(price)} × {item.quantity}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {(order.coupon_discount > 0 || order.point_used > 0) && (
                  <div className="text-xs text-green-400 space-y-0.5 mb-2">
                    {order.coupon_discount > 0 && <div>쿠폰 -{formatPrice(order.coupon_discount)}</div>}
                    {order.point_used > 0     && <div>포인트 -{order.point_used.toLocaleString()}P</div>}
                  </div>
                )}
                <Link href={`/admin/orders/${order.id}`}
                  className="text-xs text-accent hover:underline">
                  주문 상세 보기 →
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-7 h-7 rounded text-xs font-mono border transition-colors ${
                p === page ? 'bg-accent border-accent text-white' : 'bg-bg-3 border-border text-ink-2'
              }`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
