'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal, ModalActions } from '@/components/ui/Modal'
import { FormField, Textarea } from '@/components/ui/Input'
import { OrderTimeline } from '@/components/admin/order/OrderTimeline'
import { ShipmentForm } from '@/components/admin/order/ShipmentForm'
import { formatPrice, formatDateTime } from '@/lib/utils'
import { ORDER_STATUS_LABEL, ORDER_STATUS_VARIANT, ORDER_STATUS_TRANSITIONS, type OrderDetail, type OrderStatus } from '@/types/order'

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusModal, setStatusModal] = useState(false)
  const [targetStatus, setTargetStatus] = useState<OrderStatus | null>(null)
  const [memo, setMemo] = useState('')
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusError, setStatusError] = useState('')

  const fetchOrder = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/orders/${params.id}`)
    const json = await res.json()
    if (res.ok) setOrder(json.data)
    setLoading(false)
  }, [params.id])

  useEffect(() => { fetchOrder() }, [fetchOrder])

  async function handleStatusChange() {
    if (!targetStatus || !order) return
    setStatusLoading(true); setStatusError('')
    const res = await fetch(`/api/orders/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: targetStatus, memo: memo || undefined }),
    })
    const json = await res.json()
    if (!res.ok) { setStatusError(json.error ?? '변경 실패'); setStatusLoading(false); return }
    setStatusLoading(false); setStatusModal(false); setMemo('')
    fetchOrder()
  }

  if (loading) return (<><Topbar title="주문 상세" /><div className="flex-1 flex items-center justify-center"><span className="w-8 h-8 border-2 border-ink-3 border-t-accent rounded-full animate-spin" /></div></>)
  if (!order)  return (<><Topbar title="주문 상세" /><div className="flex-1 flex items-center justify-center text-ink-3">주문을 찾을 수 없습니다</div></>)

  const allowedNext = ORDER_STATUS_TRANSITIONS[order.status] ?? []
  const discountTotal = (order.coupon_discount ?? 0) + (order.point_used ?? 0)

  return (
    <>
      <Topbar title="주문 상세" />
      <div className="flex-1 overflow-y-auto p-6 animate-page">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>← 목록</Button>
          <span className="font-mono text-sm text-ink-2">{order.order_no}</span>
          <Badge variant={ORDER_STATUS_VARIANT[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardTitle>📦 주문 상품</CardTitle>
              <div className="space-y-3">
                {order.items.map(item => {
                  const price = item.sale_price ?? item.unit_price
                  return (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink">{item.product_name}</p>
                        <p className="text-xs text-ink-3">{formatPrice(price)} × {item.quantity}개</p>
                      </div>
                      <span className="font-mono text-sm font-semibold text-ink">{formatPrice(price * item.quantity)}</span>
                    </div>
                  )
                })}
                <div className="pt-2 space-y-1">
                  {order.coupon_discount > 0 && (
                    <div className="flex justify-between text-xs text-green-400">
                      <span>쿠폰 할인</span><span className="font-mono">-{formatPrice(order.coupon_discount)}</span>
                    </div>
                  )}
                  {order.point_used > 0 && (
                    <div className="flex justify-between text-xs text-green-400">
                      <span>포인트 사용</span><span className="font-mono">-{order.point_used.toLocaleString()}P</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold pt-1 border-t border-border">
                    <span className="text-sm text-ink">최종 결제금액</span>
                    <span className="font-mono text-ink">{formatPrice(order.total_amount)}</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <CardTitle>🏠 배송 정보</CardTitle>
              <div className="space-y-2 text-sm">
                {[['수령인', order.shipping_name], ['연락처', order.shipping_phone], ['주소', order.shipping_address], ['메모', order.memo ?? '-']].map(([label, value]) => (
                  <div key={label} className="flex gap-3">
                    <span className="text-ink-3 w-14 flex-shrink-0 text-xs pt-0.5">{label}</span>
                    <span className="text-ink-2">{value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardTitle>📅 주문 타임라인</CardTitle>
              <OrderTimeline history={order.history} currentStatus={order.status} />
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardTitle>🔄 상태 변경</CardTitle>
              {allowedNext.length === 0
                ? <p className="text-xs text-ink-3">변경 가능한 상태가 없습니다</p>
                : (
                  <div className="flex flex-col gap-2">
                    {allowedNext.map(s => (
                      <Button key={s} size="sm"
                        variant={s === 'cancelled' || s === 'returned' ? 'danger' : 'primary'}
                        onClick={() => { setTargetStatus(s); setMemo(''); setStatusError(''); setStatusModal(true) }}>
                        → {ORDER_STATUS_LABEL[s]}
                      </Button>
                    ))}
                  </div>
                )
              }
            </Card>

            {['paid','preparing','shipping','delivered'].includes(order.status) && (
              <Card>
                <CardTitle>🚚 송장 정보</CardTitle>
                <ShipmentForm orderId={params.id} shipment={order.shipment} onSaved={fetchOrder} />
              </Card>
            )}

            <Card>
              <CardTitle>👤 주문자 정보</CardTitle>
              <div className="space-y-1.5 text-xs">
                {[
                  ['이름',     order.member_name ?? order.shipping_name],
                  ['이메일',   order.member_email ?? '-'],
                  ['주문일시', formatDateTime(order.created_at)],
                  ['결제일시', order.paid_at ? formatDateTime(order.paid_at) : '-'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-1 border-b border-border last:border-0">
                    <span className="text-ink-3">{label}</span>
                    <span className="text-ink font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Modal open={statusModal} onClose={() => setStatusModal(false)}
        title={`→ ${targetStatus ? ORDER_STATUS_LABEL[targetStatus] : ''}`} size="sm">
        <FormField label="변경 메모 (선택)">
          <Textarea value={memo} onChange={e => setMemo(e.target.value)} placeholder="메모를 입력하면 타임라인에 표시됩니다" rows={3} />
        </FormField>
        {statusError && <p className="text-xs text-red-400 mt-2">{statusError}</p>}
        <ModalActions>
          <Button variant="secondary" onClick={() => setStatusModal(false)}>취소</Button>
          <Button variant={targetStatus === 'cancelled' || targetStatus === 'returned' ? 'danger' : 'primary'}
            loading={statusLoading} onClick={handleStatusChange}>변경</Button>
        </ModalActions>
      </Modal>
    </>
  )
}
