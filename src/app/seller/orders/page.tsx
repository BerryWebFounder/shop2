'use client'
// ============================================================
// /app/seller/orders/page.tsx
// 판매자 주문 관리 (배송 처리 + 정산 내역)
// ============================================================

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { OrderItem, Settlement, SellerStore } from './types'

type Tab = 'orders' | 'settlements'

const ITEM_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: '주문 확인 중', color: 'bg-gray-100 text-gray-600' },
  preparing: { label: '배송 준비 중', color: 'bg-blue-100 text-blue-700' },
  shipping:  { label: '배송 중', color: 'bg-amber-100 text-amber-700' },
  delivered: { label: '배송 완료', color: 'bg-green-100 text-green-700' },
  cancelled: { label: '취소됨', color: 'bg-red-100 text-red-600' },
}

const CARRIERS = [
  { code: 'kr.cjlogistics', name: 'CJ대한통운' },
  { code: 'kr.lotte', name: '롯데택배' },
  { code: 'kr.hanjin', name: '한진택배' },
  { code: 'kr.post', name: '우체국' },
  { code: 'kr.logen', name: '로젠택배' },
]

export default function SellerOrdersPage() {
  const supabase = createClient()
  const [store, setStore] = useState<SellerStore | null>(null)
  const [items, setItems] = useState<(OrderItem & { order_number?: string; customer_name?: string })[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [tab, setTab] = useState<Tab>('orders')
  const [loading, setLoading] = useState(true)
  const [shipping, setShipping] = useState<{ id: string; carrier: string; tracking: string } | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: storeData } = await supabase.from('seller_stores').select('*').eq('owner_id', user.id).single()
      if (!storeData) { setLoading(false); return }
      setStore(storeData)

      // 주문 아이템 (주문 정보 JOIN)
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*, orders(order_number, shipping_name, shipping_phone, shipping_addr)')
        .eq('store_id', storeData.id)
        .order('created_at', { ascending: false })

      setItems((orderItems || []).map((it: any) => ({
        ...it,
        order_number: it.orders?.order_number,
        customer_name: it.orders?.shipping_name,
      })))

      const { data: settleData } = await supabase
        .from('settlements')
        .select('*, settlement_items(*)')
        .eq('store_id', storeData.id)
        .order('period_end', { ascending: false })
      setSettlements(settleData || [])

      setLoading(false)
    }
    init()
  }, [])

  const updateItemStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('order_items').update({ item_status: status }).eq('id', id)
    if (!error) setItems(prev => prev.map(it => it.id === id ? { ...it, item_status: status as any } : it))
  }

  const submitShipping = async () => {
    if (!shipping) return
    const { error } = await supabase.from('order_items').update({
      item_status: 'shipping', tracking_number: shipping.tracking, carrier_code: shipping.carrier,
    }).eq('id', shipping.id)
    if (!error) {
      setItems(prev => prev.map(it => it.id === shipping.id ? { ...it, item_status: 'shipping', tracking_number: shipping.tracking, carrier_code: shipping.carrier } : it))
      setShipping(null)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">불러오는 중...</div>

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">주문 / 정산</h1>
        {store && (
          <div className="text-sm text-gray-500">
            수수료율 <span className="font-semibold text-indigo-600">{store.fee_rate}%</span>
          </div>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {(['orders', 'settlements'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors
              ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'orders' ? `주문 관리 (${items.filter(i => i.item_status === 'pending' || i.item_status === 'preparing').length}건 처리 필요)` : '정산 내역'}
          </button>
        ))}
      </div>

      {/* ===== 주문 관리 탭 ===== */}
      {tab === 'orders' && (
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-20">
              <p className="text-3xl mb-3">📭</p>
              <p className="text-gray-500 text-sm">주문 내역이 없습니다</p>
            </div>
          ) : items.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  {/* 상품 이미지 */}
                  <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    {item.product_image ? <img src={item.product_image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">{item.order_number}</p>
                    <p className="font-medium text-gray-900 text-sm">{item.product_name}</p>
                    {Object.keys(item.options_snapshot).length > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {Object.entries(item.options_snapshot).map(([k, v]) => `${k}: ${v}`).join(' / ')}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">수량 {item.quantity}개 · {item.total_price.toLocaleString()}원</p>
                    <p className="text-xs text-gray-400 mt-0.5">수령인: {item.customer_name}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ITEM_STATUS_LABEL[item.item_status].color}`}>
                    {ITEM_STATUS_LABEL[item.item_status].label}
                  </span>

                  {/* 상태별 액션 버튼 */}
                  {item.item_status === 'pending' && (
                    <button onClick={() => updateItemStatus(item.id, 'preparing')}
                      className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      배송 준비 시작
                    </button>
                  )}
                  {item.item_status === 'preparing' && (
                    <button onClick={() => setShipping({ id: item.id, carrier: CARRIERS[0].code, tracking: '' })}
                      className="text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
                      송장 입력
                    </button>
                  )}
                  {item.item_status === 'shipping' && (
                    <div className="text-right">
                      <p className="text-xs text-gray-400">{CARRIERS.find(c => c.code === item.carrier_code)?.name}</p>
                      <p className="text-xs font-mono text-gray-700">{item.tracking_number}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== 정산 내역 탭 ===== */}
      {tab === 'settlements' && (
        <div>
          {/* 요약 카드 */}
          {store && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <p className="text-xs text-gray-400">이번 달 매출</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {items.filter(i => i.item_status === 'delivered').reduce((s, i) => s + i.total_price, 0).toLocaleString()}원
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <p className="text-xs text-gray-400">수수료 ({store.fee_rate}%)</p>
                <p className="text-2xl font-bold text-red-500 mt-1">
                  -{(items.filter(i => i.item_status === 'delivered').reduce((s, i) => s + i.total_price, 0) * store.fee_rate / 100).toLocaleString()}원
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <p className="text-xs text-gray-400">정산 예정액</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">
                  {(items.filter(i => i.item_status === 'delivered').reduce((s, i) => s + i.total_price, 0) * (1 - store.fee_rate / 100)).toLocaleString()}원
                </p>
              </div>
            </div>
          )}

          {settlements.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-20">
              <p className="text-3xl mb-3">💳</p>
              <p className="text-gray-500 text-sm">정산 내역이 없습니다</p>
              <p className="text-xs text-gray-400 mt-1">배송 완료 후 관리자가 정산을 생성합니다</p>
            </div>
          ) : settlements.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-5 mb-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {new Date(s.period_start).toLocaleDateString('ko-KR', { month: 'long' })} 정산
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {s.period_start} ~ {s.period_end}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium
                  ${s.status === 'completed' ? 'bg-green-100 text-green-700'
                    : s.status === 'processing' ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'}`}>
                  {s.status === 'completed' ? '지급 완료' : s.status === 'processing' ? '처리 중' : '정산 대기'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-50">
                <div>
                  <p className="text-xs text-gray-400">총 매출</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{s.gross_amount.toLocaleString()}원</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">수수료 ({s.fee_rate}%)</p>
                  <p className="text-sm font-semibold text-red-500 mt-0.5">-{s.fee_amount.toLocaleString()}원</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">정산액</p>
                  <p className="text-sm font-bold text-indigo-600 mt-0.5">{s.net_amount.toLocaleString()}원</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== 송장 입력 모달 ===== */}
      {shipping && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">송장 정보 입력</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">택배사</label>
                <select value={shipping.carrier} onChange={e => setShipping(prev => prev ? { ...prev, carrier: e.target.value } : null)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
                  {CARRIERS.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">송장번호</label>
                <input value={shipping.tracking} onChange={e => setShipping(prev => prev ? { ...prev, tracking: e.target.value } : null)}
                  placeholder="송장번호를 입력하세요"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShipping(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition-colors">취소</button>
              <button onClick={submitShipping} disabled={!shipping.tracking.trim()}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
