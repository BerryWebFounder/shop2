'use client'
// ================================================================
// src/app/seller/orders/page.tsx
// 판매자 주문 관리 + 정산 내역
// ================================================================

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  type SellerStore, type OrderItem, type Settlement,
  type OrderItemStatus, type CarrierCode,
  ORDER_ITEM_STATUS_META, CARRIERS,
} from '@/lib/types/v2'

type Tab = 'orders' | 'settlements'

// 배송 입력 상태
interface ShippingInput {
  itemId:  string
  carrier: CarrierCode
  tracking: string
}

// ── 메인 페이지 ──────────────────────────────────────────────────
export default function SellerOrdersPage() {
  const supabase = createClient()

  const [store,       setStore]       = useState<SellerStore | null>(null)
  const [items,       setItems]       = useState<OrderItem[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [tab,         setTab]         = useState<Tab>('orders')
  const [loading,     setLoading]     = useState(true)
  const [shipping,    setShipping]    = useState<ShippingInput | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: s } = await supabase
        .from('seller_stores').select('*').eq('owner_id', user.id).single()
      if (!s) { setLoading(false); return }
      setStore(s)

      // 주문 아이템 (주문 정보 join)
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*, order:orders(order_number, shipping_name, shipping_phone, shipping_addr, created_at)')
        .eq('store_id', s.id)
        .order('created_at', { ascending: false })
      setItems(orderItems ?? [])

      // 정산 내역
      const { data: settleData } = await supabase
        .from('settlements')
        .select('*')
        .eq('store_id', s.id)
        .order('period_end', { ascending: false })
      setSettlements(settleData ?? [])

      setLoading(false)
    })()
  }, [])

  const updateItemStatus = async (id: string, status: OrderItemStatus) => {
    const { error } = await supabase
      .from('order_items').update({ item_status: status }).eq('id', id)
    if (!error) setItems(prev => prev.map(it => it.id === id ? { ...it, item_status: status } : it))
  }

  const submitShipping = async () => {
    if (!shipping?.tracking.trim()) return
    const { error } = await supabase.from('order_items').update({
      item_status:     'shipping',
      tracking_number: shipping.tracking,
      carrier_code:    shipping.carrier,
    }).eq('id', shipping.itemId)

    if (!error) {
      setItems(prev => prev.map(it =>
        it.id === shipping.itemId
          ? { ...it, item_status: 'shipping', tracking_number: shipping.tracking, carrier_code: shipping.carrier }
          : it
      ))
      setShipping(null)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400 text-sm">불러오는 중...</div>

  // 처리 필요 건수 (pending + preparing)
  const pendingCount = items.filter(i => i.item_status === 'pending' || i.item_status === 'preparing').length

  // 이번 달 배송완료 아이템 기준 매출
  const deliveredRevenue = items
    .filter(i => i.item_status === 'delivered')
    .reduce((s, i) => s + i.total_price, 0)
  const feeRate    = store?.fee_rate ?? 5
  const feeAmount  = Math.round(deliveredRevenue * feeRate / 100)
  const netAmount  = deliveredRevenue - feeAmount

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">주문 / 정산</h1>
        {store && (
          <p className="text-sm text-gray-500">
            수수료율 <span className="font-semibold text-indigo-600">{store.fee_rate}%</span>
          </p>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        <TabBtn active={tab === 'orders'} onClick={() => setTab('orders')}>
          주문 관리 {pendingCount > 0 && `(${pendingCount}건 처리 필요)`}
        </TabBtn>
        <TabBtn active={tab === 'settlements'} onClick={() => setTab('settlements')}>
          정산 내역
        </TabBtn>
      </div>

      {/* ── 주문 탭 ────────────────────────────────────────── */}
      {tab === 'orders' && (
        <div className="space-y-3">
          {items.length === 0 ? (
            <EmptyBox icon="📭" text="주문 내역이 없습니다" />
          ) : items.map(item => (
            <OrderItemCard key={item.id} item={item}
              onPrepare={() => updateItemStatus(item.id, 'preparing')}
              onShipClick={() => setShipping({
                itemId: item.id,
                carrier: CARRIERS[0].code,
                tracking: '',
              })}
            />
          ))}
        </div>
      )}

      {/* ── 정산 탭 ────────────────────────────────────────── */}
      {tab === 'settlements' && (
        <div>
          {/* 요약 카드 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <KpiCard label="배송완료 매출" value={`${deliveredRevenue.toLocaleString()}원`} />
            <KpiCard label={`수수료 (${feeRate}%)`} value={`-${feeAmount.toLocaleString()}원`} valueClass="text-red-500" />
            <KpiCard label="정산 예정액" value={`${netAmount.toLocaleString()}원`} valueClass="text-indigo-600" />
          </div>

          {settlements.length === 0 ? (
            <EmptyBox icon="💳" text="정산 내역이 없습니다" sub="배송 완료 후 관리자가 정산을 생성합니다" />
          ) : settlements.map(s => <SettlementCard key={s.id} settlement={s} />)}
        </div>
      )}

      {/* 송장 입력 모달 */}
      {shipping && (
        <ShippingModal
          shipping={shipping}
          onChange={patch => setShipping(prev => prev ? { ...prev, ...patch } : null)}
          onSubmit={submitShipping}
          onClose={() => setShipping(null)}
        />
      )}
    </div>
  )
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────────

function TabBtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button onClick={onClick}
      className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors
        ${active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
      {children}
    </button>
  )
}

function OrderItemCard({ item, onPrepare, onShipClick }: {
  item: OrderItem; onPrepare: () => void; onShipClick: () => void
}) {
  const meta       = ORDER_ITEM_STATUS_META[item.item_status]
  const orderInfo  = item.order
  const optEntries = Object.entries(item.options_snapshot as Record<string, string>)

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-start justify-between">
        {/* 왼쪽: 상품 정보 */}
        <div className="flex gap-4">
          <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0">
            {item.product_image
              ? <img src={item.product_image} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
            }
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">{orderInfo?.order_number}</p>
            <p className="font-medium text-gray-900 text-sm">{item.product_name}</p>
            {optEntries.length > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">
                {optEntries.map(([k, v]) => `${k}: ${v}`).join(' / ')}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              수량 {item.quantity}개 · {item.total_price.toLocaleString()}원
            </p>
            {orderInfo && (
              <p className="text-xs text-gray-400 mt-0.5">수령인: {orderInfo.shipping_name}</p>
            )}
          </div>
        </div>

        {/* 오른쪽: 상태 + 액션 */}
        <div className="flex flex-col items-end gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${meta.color}`}>
            {meta.label}
          </span>
          {item.item_status === 'pending' && (
            <button onClick={onPrepare}
              className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              배송 준비 시작
            </button>
          )}
          {item.item_status === 'preparing' && (
            <button onClick={onShipClick}
              className="text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
              송장 입력
            </button>
          )}
          {item.item_status === 'shipping' && item.tracking_number && (
            <div className="text-right">
              <p className="text-xs text-gray-400">
                {CARRIERS.find(c => c.code === item.carrier_code)?.name}
              </p>
              <p className="text-xs font-mono text-gray-700">{item.tracking_number}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SettlementCard({ settlement: s }: { settlement: Settlement }) {
  const statusMeta: Record<string, { label: string; cls: string }> = {
    completed:  { label: '지급 완료', cls: 'bg-green-100 text-green-700' },
    processing: { label: '처리 중',   cls: 'bg-blue-100 text-blue-700'   },
    pending:    { label: '정산 대기', cls: 'bg-gray-100 text-gray-600'   },
    failed:     { label: '실패',      cls: 'bg-red-100 text-red-600'     },
  }
  const { label, cls } = statusMeta[s.status] ?? statusMeta.pending

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900">
            {new Date(s.period_end).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })} 정산
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{s.period_start} ~ {s.period_end}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cls}`}>{label}</span>
      </div>

      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-50">
        <div>
          <p className="text-xs text-gray-400">총 매출</p>
          <p className="text-sm font-semibold text-gray-800 mt-0.5">
            {s.gross_amount.toLocaleString()}원
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">수수료 ({s.fee_rate}%)</p>
          <p className="text-sm font-semibold text-red-500 mt-0.5">
            -{s.fee_amount.toLocaleString()}원
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">정산액</p>
          <p className="text-sm font-bold text-indigo-600 mt-0.5">
            {s.net_amount.toLocaleString()}원
          </p>
        </div>
      </div>
    </div>
  )
}

function ShippingModal({ shipping, onChange, onSubmit, onClose }: {
  shipping: ShippingInput
  onChange: (patch: Partial<ShippingInput>) => void
  onSubmit: () => void
  onClose:  () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-96">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">송장 정보 입력</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">택배사</label>
            <select
              value={shipping.carrier}
              onChange={e => onChange({ carrier: e.target.value as CarrierCode })}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
              {CARRIERS.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">송장번호</label>
            <input
              value={shipping.tracking}
              onChange={e => onChange({ tracking: e.target.value })}
              placeholder="송장번호를 입력하세요"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition-colors">
            취소
          </button>
          <button onClick={onSubmit} disabled={!shipping.tracking.trim()}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700 disabled:opacity-60 transition-colors">
            저장
          </button>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, valueClass = 'text-gray-900' }: {
  label: string; value: string; valueClass?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${valueClass}`}>{value}</p>
    </div>
  )
}

function EmptyBox({ icon, text, sub }: { icon: string; text: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-20">
      <p className="text-3xl mb-3">{icon}</p>
      <p className="text-gray-500 text-sm">{text}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}
