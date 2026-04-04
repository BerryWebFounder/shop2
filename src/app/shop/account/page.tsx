import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { formatPrice, formatDateTime } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: '마이페이지' }

const MENU = [
  { href: '/shop/orders',           icon: '🛒', label: '주문 내역',   desc: '주문 현황과 배송 조회' },
  { href: '/shop/account/addresses',icon: '📍', label: '배송지 관리', desc: '자주 쓰는 배송지 등록/수정' },
  { href: '/shop/account/profile',  icon: '👤', label: '회원 정보',   desc: '이름, 연락처, 비밀번호 변경' },
  { href: '/shop/support',          icon: '💬', label: '1:1 문의',    desc: '주문/배송/상품 문의' },
  { href: '/shop/support/inquiries',icon: '📋', label: '내 문의 내역', desc: '접수한 문의 확인' },
]

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/shop/auth/login?redirect=/shop/account')

  const svc = createServiceClient()
  const { data: member } = await svc
    .from('members')
    .select('id, name, phone, grade, total_order_amount, order_count, point_balance')
    .eq('email', user.email ?? '')
    .single()

  // 최근 주문 3건
  const { data: recentOrders } = await svc
    .from('orders')
    .select('id, order_no, total_amount, status, created_at, items:order_items(product_name)')
    .eq('member_id', member?.id ?? '')
    .order('created_at', { ascending: false })
    .limit(3)

  const STATUS: Record<string, string> = {
    pending: '결제대기', paid: '결제완료', preparing: '상품준비중',
    shipping: '배송중', delivered: '배송완료', cancelled: '취소됨', returned: '반품', refunded: '환불완료',
  }
  const STATUS_COLOR: Record<string, string> = {
    pending: '#f59e0b', paid: '#3b82f6', preparing: '#8b5cf6',
    shipping: '#06b6d4', delivered: '#10b981', cancelled: '#6b7280', returned: '#ef4444', refunded: '#6b7280',
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }} className="px-4 sm:px-6 py-8 md:py-10">

      {/* 프로필 헤더 */}
      <div className="rounded-2xl p-6 mb-6 flex items-center gap-5"
        style={{ background: 'var(--shop-ink)', color: 'var(--shop-bg)' }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.15)' }}>
          {(member?.name ?? user.email ?? '?')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-lg leading-tight truncate">
            {member?.name ?? '회원'}
          </p>
          <p className="text-sm opacity-60 truncate">{user.email}</p>
        </div>
        <Link href="/shop/account/profile"
          className="text-xs px-3 py-1.5 rounded-full transition-all flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.15)' }}>
          정보 수정
        </Link>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: '총 주문',   value: `${member?.order_count ?? 0}건` },
          { label: '총 구매액', value: formatPrice(member?.total_order_amount ?? 0) },
          { label: '포인트',    value: `${(member?.point_balance ?? 0).toLocaleString()}P` },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4 text-center"
            style={{ background: 'var(--shop-bg2)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--shop-ink3)' }}>{s.label}</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--shop-ink)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* 최근 주문 */}
      {recentOrders && recentOrders.length > 0 && (
        <div className="rounded-2xl p-5 mb-6" style={{ background: 'var(--shop-bg2)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--shop-ink)' }}>최근 주문</h2>
            <Link href="/shop/orders" className="text-xs" style={{ color: 'var(--shop-accent)' }}>
              전체 보기 →
            </Link>
          </div>
          <div className="space-y-3">
            {recentOrders.map(order => (
              <Link key={order.id} href={`/shop/orders/${order.id}`}
                className="flex items-center justify-between gap-3 hover:opacity-70 transition-opacity">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono mb-0.5" style={{ color: 'var(--shop-ink3)' }}>
                    {order.order_no}
                  </p>
                  <p className="text-sm truncate" style={{ color: 'var(--shop-ink)' }}>
                    {(order.items as any[])[0]?.product_name ?? '상품'}
                    {(order.items as any[]).length > 1 && ` 외 ${(order.items as any[]).length - 1}개`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: STATUS_COLOR[order.status] + '20', color: STATUS_COLOR[order.status] }}>
                    {STATUS[order.status] ?? order.status}
                  </span>
                  <p className="text-xs mt-1 font-mono" style={{ color: 'var(--shop-ink2)' }}>
                    {formatPrice(order.total_amount)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 메뉴 목록 */}
      <div className="space-y-2">
        {MENU.map(item => (
          <Link key={item.href} href={item.href}
            className="flex items-center gap-4 p-4 rounded-2xl transition-all group"
            style={{ background: 'var(--shop-bg2)' }}>
            <span className="text-2xl">{item.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: 'var(--shop-ink)' }}>{item.label}</p>
              <p className="text-xs" style={{ color: 'var(--shop-ink3)' }}>{item.desc}</p>
            </div>
            <span style={{ color: 'var(--shop-ink3)' }}>›</span>
          </Link>
        ))}
      </div>

    </div>
  )
}
