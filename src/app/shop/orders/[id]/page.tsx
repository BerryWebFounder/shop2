import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TrackingInfo } from '@/components/shop/order/TrackingInfo'
import { Badge } from '@/components/ui/Badge'
import { ORDER_STATUS_LABEL, ORDER_STATUS_VARIANT } from '@/types/order'
import { formatPrice, formatDateTime } from '@/lib/utils'
import type { OrderStatus, OrderStatusHistory, OrderShipment } from '@/types/order'

export default async function ShopOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/shop/auth/login?redirect=/shop/orders')

  const [{ data: order }, { data: items }, { data: history }, { data: shipment }] = await Promise.all([
    supabase.from('orders').select('*').eq('id', id).single(),
    supabase.from('order_items').select('*').eq('order_id', id).order('created_at'),
    supabase.from('order_status_history').select('*').eq('order_id', id).order('created_at'),
    supabase.from('order_shipments').select('*').eq('order_id', id).single(),
  ])

  if (!order) notFound()

  const discountTotal = (order.coupon_discount ?? 0) + (order.point_used ?? 0)

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }} className="px-6 md:px-8 py-10">
      <Link href="/shop/orders" className="flex items-center gap-1.5 text-sm mb-6 transition-colors"
        style={{ color: 'var(--shop-ink3)' }}>
        ← 주문 내역
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}>
            주문 상세
          </h1>
          <p className="text-xs font-mono" style={{ color: 'var(--shop-ink3)' }}>{order.order_no}</p>
        </div>
        <Badge variant={ORDER_STATUS_VARIANT[order.status as OrderStatus]}>
          {ORDER_STATUS_LABEL[order.status as OrderStatus]}
        </Badge>
      </div>

      {/* 배송 추적 */}
      <div className="rounded-2xl p-6 mb-5" style={{ background: 'var(--shop-bg2)' }}>
        <h2 className="text-sm font-semibold mb-5" style={{ color: 'var(--shop-ink)' }}>배송 현황</h2>
        <TrackingInfo
          status={order.status as OrderStatus}
          history={(history ?? []) as OrderStatusHistory[]}
          shipment={shipment as OrderShipment | null}
        />
      </div>

      {/* 주문 상품 */}
      <div className="rounded-2xl p-6 mb-5" style={{ border: '1.5px solid var(--shop-border)' }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--shop-ink)' }}>주문 상품</h2>
        <div className="space-y-3">
          {(items ?? []).map((item: {
            id: string; product_name: string; unit_price: number
            sale_price: number | null; quantity: number
          }) => {
            const price = item.sale_price ?? item.unit_price
            return (
              <div key={item.id} className="flex items-center justify-between py-2 border-b"
                style={{ borderColor: 'var(--shop-border)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--shop-ink)' }}>{item.product_name}</p>
                  <p className="text-xs" style={{ color: 'var(--shop-ink3)' }}>
                    {formatPrice(price)} × {item.quantity}개
                  </p>
                </div>
                <span className="text-sm font-semibold font-mono" style={{ color: 'var(--shop-ink)' }}>
                  {formatPrice(price * item.quantity)}
                </span>
              </div>
            )
          })}

          {/* 금액 */}
          <div className="space-y-1.5 pt-2">
            {order.coupon_discount > 0 && (
              <div className="flex justify-between text-xs" style={{ color: '#34d399' }}>
                <span>쿠폰 할인</span><span>-{formatPrice(order.coupon_discount)}</span>
              </div>
            )}
            {order.point_used > 0 && (
              <div className="flex justify-between text-xs" style={{ color: '#34d399' }}>
                <span>포인트 사용</span><span>-{order.point_used.toLocaleString()}P</span>
              </div>
            )}
            <div className="flex justify-between font-semibold pt-1.5 border-t"
              style={{ borderColor: 'var(--shop-border)', color: 'var(--shop-ink)' }}>
              <span>최종 결제금액</span>
              <span className="font-mono">{formatPrice(order.total_amount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 배송지 */}
      <div className="rounded-2xl p-6" style={{ border: '1.5px solid var(--shop-border)' }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--shop-ink)' }}>배송지 정보</h2>
        <div className="space-y-2 text-sm">
          {[
            ['수령인', order.shipping_name],
            ['연락처', order.shipping_phone],
            ['주소',   order.shipping_address],
            ['주문일', formatDateTime(order.created_at)],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-4">
              <span className="w-14 flex-shrink-0 text-xs pt-0.5" style={{ color: 'var(--shop-ink3)' }}>{label}</span>
              <span style={{ color: 'var(--shop-ink2)' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
