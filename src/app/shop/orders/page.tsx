import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatPrice, formatDateTime } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { ORDER_STATUS_LABEL, ORDER_STATUS_VARIANT } from '@/types/order'
import type { OrderStatus } from '@/types/order'

export default async function MyOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/shop/auth/login?redirect=/shop/orders')

  const { data: member } = await supabase
    .from('members').select('id').eq('email', user.email ?? '').single()

  const { data: orders } = await supabase
    .from('orders')
    .select(`*, items:order_items(id, product_name, quantity, unit_price, sale_price)`)
    .eq('member_id', member?.id ?? '')
    .order('created_at', { ascending: false })

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }} className="px-6 md:px-8 py-10">
      <h1 className="text-3xl mb-8" style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}>
        주문 내역
      </h1>

      {!orders || orders.length === 0 ? (
        <div className="text-center py-24" style={{ color: 'var(--shop-ink3)' }}>
          <p className="text-5xl mb-4">📋</p>
          <p className="text-lg font-medium mb-2" style={{ color: 'var(--shop-ink2)' }}>주문 내역이 없습니다</p>
          <Link href="/shop/products"
            className="inline-block mt-4 px-6 py-3 rounded-full text-sm font-semibold"
            style={{ background: 'var(--shop-ink)', color: 'white' }}>
            쇼핑하기
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="rounded-2xl overflow-hidden"
              style={{ border: '1.5px solid var(--shop-border)' }}>
              {/* 주문 헤더 */}
              <div className="flex items-center justify-between px-5 py-4"
                style={{ background: 'var(--shop-bg2)', borderBottom: '1px solid var(--shop-border)' }}>
                <div>
                  <p className="text-xs font-mono mb-1" style={{ color: 'var(--shop-ink3)' }}>
                    {formatDateTime(order.created_at)}
                  </p>
                  <p className="text-sm font-semibold font-mono" style={{ color: 'var(--shop-ink)' }}>
                    {order.order_no}
                  </p>
                </div>
                <Badge variant={ORDER_STATUS_VARIANT[order.status as OrderStatus]}>
                  {ORDER_STATUS_LABEL[order.status as OrderStatus] ?? order.status}
                </Badge>
              </div>

              {/* 상품 목록 */}
              <div className="px-5 py-4">
                {(order.items ?? []).map((item: {
                  id: string; product_name: string; quantity: number
                  unit_price: number; sale_price: number | null
                }) => (
                  <div key={item.id} className="flex justify-between items-center py-2"
                    style={{ borderBottom: '1px solid var(--shop-bg2)' }}>
                    <p className="text-sm" style={{ color: 'var(--shop-ink)' }}>
                      {item.product_name}
                      <span className="ml-2 text-xs" style={{ color: 'var(--shop-ink3)' }}>
                        × {item.quantity}
                      </span>
                    </p>
                    <p className="text-sm font-medium font-mono" style={{ color: 'var(--shop-ink)' }}>
                      {formatPrice((item.sale_price ?? item.unit_price) * item.quantity)}
                    </p>
                  </div>
                ))}

                {/* 합계 */}
                <div className="flex justify-between items-center pt-3 mt-1">
                  <span className="text-xs" style={{ color: 'var(--shop-ink3)' }}>총 결제금액</span>
                  <span className="font-semibold font-mono" style={{ color: 'var(--shop-ink)' }}>
                    {formatPrice(order.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
