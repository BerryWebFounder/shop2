// ================================================================
// src/app/seller/page.tsx
// 판매자 대시보드 홈 — 상점 운영 현황 요약
// ================================================================
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { SellerStore, OrderItem, Settlement } from '@/lib/types/v2'

interface DashboardStats {
  store:            SellerStore | null
  recentItems:      OrderItem[]
  pendingCount:     number
  latestSettlement: Settlement | null
  unreadNotifCount: number
}

export default function SellerDashboardPage() {
  const supabase = createClient()
  const [stats,   setStats]   = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: store } = await supabase
        .from('seller_stores')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      if (!store) { setLoading(false); return }

      const [
        { data: recentItems },
        { data: settlement },
        { count: unreadCount },
      ] = await Promise.all([
        supabase
          .from('order_items')
          .select('*, order:orders(order_number, shipping_name, created_at)')
          .eq('store_id', store.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('settlements')
          .select('*')
          .eq('store_id', store.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from('seller_notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false),
      ])

      const pendingCount = (recentItems ?? [])
        .filter(i => i.item_status === 'pending' || i.item_status === 'preparing').length

      setStats({
        store,
        recentItems:      recentItems ?? [],
        pendingCount,
        latestSettlement: settlement ?? null,
        unreadNotifCount: unreadCount ?? 0,
      })
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400 text-sm">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-3" />
        불러오는 중...
      </div>
    )
  }

  if (!stats?.store) {
    return (
      <div className="flex items-center justify-center h-screen px-4">
        <div className="text-center">
          <p className="text-3xl mb-3">🏪</p>
          <p className="text-gray-600 text-sm">상점 정보를 찾을 수 없습니다.</p>
          <Link href="/seller/apply" className="mt-4 inline-block text-indigo-600 text-sm hover:underline">
            상점 신청하기 →
          </Link>
        </div>
      </div>
    )
  }

  const { store, recentItems, pendingCount, latestSettlement, unreadNotifCount } = stats

  const kpis = [
    { label: '총 상품',    value: store.total_products, unit: '개', href: '/seller/products', color: 'text-indigo-600' },
    { label: '총 주문',    value: store.total_orders,   unit: '건', href: '/seller/orders',   color: 'text-blue-600'   },
    { label: '처리 필요',  value: pendingCount,           unit: '건', href: '/seller/orders',   color: pendingCount > 0 ? 'text-amber-600' : 'text-gray-400' },
    { label: '누적 매출',  value: Math.floor(store.total_revenue).toLocaleString(), unit: '원', href: '/seller/orders', color: 'text-green-600' },
  ]

  const quickLinks = [
    { href: '/seller/products', icon: '📦', label: '상품 등록' },
    { href: '/seller/orders',   icon: '🚚', label: '주문 관리' },
    { href: '/seller/store',    icon: '⚙️', label: '상점 설정' },
    { href: `/stores/${store.slug}`, icon: '🏪', label: '내 상점 보기', external: true },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">안녕하세요, {store.store_name} 👋</h1>
          <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />운영 중
            </span>
            <a href={`/stores/${store.slug}`} target="_blank" rel="noreferrer"
              className="text-indigo-600 hover:underline text-xs">
              /stores/{store.slug}
            </a>
            {unreadNotifCount > 0 && (
              <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-xs font-medium">
                알림 {unreadNotifCount}건
              </span>
            )}
          </p>
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {kpis.map(k => (
          <Link key={k.label} href={k.href}
            className="bg-white rounded-xl border border-gray-100 p-5 hover:border-indigo-200 hover:shadow-sm transition-all">
            <p className="text-xs text-gray-400 mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>
              {k.value}<span className="text-sm font-normal text-gray-400 ml-0.5">{k.unit}</span>
            </p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 최근 주문 */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">최근 주문</h2>
            <Link href="/seller/orders" className="text-xs text-indigo-600 hover:underline">전체 보기</Link>
          </div>
          {recentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <p className="text-2xl mb-2">📭</p>
              <p className="text-xs">아직 주문이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentItems.map(item => {
                const statusColor: Record<string, string> = {
                  pending:   'bg-gray-100 text-gray-600',
                  preparing: 'bg-blue-100 text-blue-700',
                  shipping:  'bg-amber-100 text-amber-700',
                  delivered: 'bg-green-100 text-green-700',
                  cancelled: 'bg-red-100 text-red-600',
                }
                const statusLabel: Record<string, string> = {
                  pending: '확인 중', preparing: '준비 중', shipping: '배송 중',
                  delivered: '완료', cancelled: '취소',
                }
                return (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        수량 {item.quantity}개 · {item.total_price.toLocaleString()}원
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-3 ${statusColor[item.item_status]}`}>
                      {statusLabel[item.item_status]}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 우측 패널 */}
        <div className="space-y-5">
          {/* 빠른 메뉴 */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">빠른 메뉴</h2>
            <div className="grid grid-cols-2 gap-2">
              {quickLinks.map(l => (
                <a key={l.href} href={l.href}
                  target={l.external ? '_blank' : undefined}
                  rel={l.external ? 'noreferrer' : undefined}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-gray-600">
                  <span className="text-xl">{l.icon}</span>
                  <span className="text-xs font-medium">{l.label}</span>
                </a>
              ))}
            </div>
          </div>

          {/* 최근 정산 */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-800">최근 정산</h2>
              <Link href="/seller/orders" className="text-xs text-indigo-600 hover:underline">내역 보기</Link>
            </div>
            {latestSettlement ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-xs">기간</span>
                  <span className="text-gray-700 text-xs">{latestSettlement.period_start} ~ {latestSettlement.period_end}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-xs">총 매출</span>
                  <span className="text-gray-800 text-xs font-medium">{latestSettlement.gross_amount.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-xs">수수료 ({latestSettlement.fee_rate}%)</span>
                  <span className="text-red-500 text-xs">-{latestSettlement.fee_amount.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-50">
                  <span className="text-gray-500 text-xs font-semibold">정산액</span>
                  <span className="text-indigo-600 text-sm font-bold">{latestSettlement.net_amount.toLocaleString()}원</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">정산 내역이 없습니다</p>
            )}
          </div>

          {/* 수수료율 */}
          <div className="bg-indigo-50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-indigo-500 font-medium">현재 수수료율</p>
              <p className="text-xs text-indigo-400 mt-0.5">매출의 {store.fee_rate}% 차감</p>
            </div>
            <span className="text-3xl font-bold text-indigo-600">{store.fee_rate}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
