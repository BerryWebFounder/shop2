import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/layout/Topbar'
import { StatCard, Card, CardTitle } from '@/components/ui/Card'
import { Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from '@/components/ui/Table'
import { Badge, ProductStatusBadge } from '@/components/ui/Badge'
import { formatPrice, formatDateTime } from '@/lib/utils'

async function getDashboardData() {
  const supabase = await createClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalMembers },
    { count: newMembers },
    { count: todayOrders },
    { data: revenueRows },
    { count: displayedProducts },
    { count: totalProducts },
    { count: lowStock },
    { data: recentOrders },
    { data: lowStockProducts },
    { data: weeklySalesRaw },
  ] = await Promise.all([
    supabase.from('members').select('*', { count: 'exact', head: true }).neq('status', 'withdrawn'),
    supabase.from('members').select('*', { count: 'exact', head: true }).gte('join_date', startOfMonth),
    supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', startOfToday),
    supabase.from('orders').select('total_amount').gte('created_at', startOfToday).not('status', 'eq', 'cancelled'),
    supabase.from('display_items').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }).lte('stock', 5).neq('status', 'stop'),
    supabase.from('orders').select('order_no, total_amount, status, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('products').select('id, name, stock, status').lte('stock', 5).neq('status', 'stop').order('stock').limit(5),
    supabase.from('orders').select('created_at, total_amount').gte('created_at', sevenDaysAgo).not('status', 'eq', 'cancelled'),
  ])

  const todayRevenue = (revenueRows ?? []).reduce((s: number, o: { total_amount: number }) => s + (o.total_amount || 0), 0)

  // 주간 매출 집계
  const salesByDay: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i)
    salesByDay[d.toISOString().slice(0, 10)] = 0
  }
  ;(weeklySalesRaw ?? []).forEach((o: { created_at: string; total_amount: number }) => {
    const day = o.created_at.slice(0, 10)
    if (day in salesByDay) salesByDay[day] += o.total_amount || 0
  })
  const weeklySales = Object.entries(salesByDay).map(([date, revenue]) => ({ date, revenue }))
  const maxRevenue = Math.max(...weeklySales.map(d => d.revenue), 1)

  return { totalMembers, newMembers, todayOrders, todayRevenue, displayedProducts, totalProducts, lowStock, recentOrders, lowStockProducts, weeklySales, maxRevenue }
}

const ORDER_STATUS_MAP: Record<string, { label: string; variant: 'green' | 'blue' | 'yellow' | 'gray' | 'red' }> = {
  pending:   { label: '결제대기', variant: 'gray' },
  paid:      { label: '결제완료', variant: 'blue' },
  shipping:  { label: '배송중',   variant: 'yellow' },
  delivered: { label: '배송완료', variant: 'green' },
  returned:  { label: '반품요청', variant: 'red' },
  cancelled: { label: '취소',     variant: 'gray' },
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const data = await getDashboardData()
  const days = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <>
      <Topbar title="대시보드" adminEmail={user?.email} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 animate-page">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
          <StatCard label="총 회원 수" value={(data.totalMembers ?? 0).toLocaleString()} change={`이번 달 +${data.newMembers ?? 0}명`} changeType="up" icon="👥" />
          <StatCard label="오늘 주문" value={(data.todayOrders ?? 0).toLocaleString()} icon="🛒" />
          <StatCard label="오늘 매출" value={formatPrice(data.todayRevenue)} icon="💰" />
          <StatCard label="전시 상품" value={`${data.displayedProducts ?? 0} / ${data.totalProducts ?? 0}`} icon="🖼️" />
          <StatCard label="재고 부족" value={data.lowStock ?? 0} change={data.lowStock ? '즉시 확인 필요' : '문제 없음'} changeType={data.lowStock ? 'down' : 'neutral'} icon="⚠️" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* 주간 매출 차트 */}
          <Card>
            <CardTitle>📈 주간 매출</CardTitle>
            <div className="flex items-end gap-1.5 h-20">
              {data.weeklySales.map(({ date, revenue }) => {
                const d = new Date(date)
                const pct = Math.max((revenue / data.maxRevenue) * 100, revenue > 0 ? 8 : 2)
                return (
                  <div key={date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-accent/60 hover:bg-accent rounded-t transition-colors cursor-default"
                      style={{ height: `${pct}%` }}
                      title={formatPrice(revenue)}
                    />
                    <span className="text-[10px] text-ink-3">{days[d.getDay()]}</span>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* 최근 주문 */}
          <Card noPadding>
            <div className="px-5 pt-4 pb-3">
              <CardTitle>🛒 최근 주문</CardTitle>
            </div>
            <Table>
              <Thead>
                <tr>
                  <Th>주문번호</Th><Th>금액</Th><Th>일시</Th><Th>상태</Th>
                </tr>
              </Thead>
              <Tbody>
                {(data.recentOrders ?? []).length === 0
                  ? <EmptyRow colSpan={4} message="주문 없음" />
                  : (data.recentOrders ?? []).map((o: { order_no: string; total_amount: number; status: string; created_at: string }) => {
                    const s = ORDER_STATUS_MAP[o.status] ?? { label: o.status, variant: 'gray' as const }
                    return (
                      <Tr key={o.order_no}>
                        <Td><span className="font-mono text-xs text-ink-2">#{o.order_no}</span></Td>
                        <Td><span className="font-mono text-xs">{formatPrice(o.total_amount)}</span></Td>
                        <Td><span className="text-xs text-ink-3">{formatDateTime(o.created_at)}</span></Td>
                        <Td><Badge variant={s.variant}>{s.label}</Badge></Td>
                      </Tr>
                    )
                  })
                }
              </Tbody>
            </Table>
          </Card>
        </div>

        {/* 재고 부족 */}
        {(data.lowStockProducts ?? []).length > 0 && (
          <Card noPadding>
            <div className="px-5 pt-4 pb-3">
              <CardTitle>⚠️ 재고 부족 상품</CardTitle>
            </div>
            <Table>
              <Thead>
                <tr><Th>상품명</Th><Th>재고</Th><Th>상태</Th></tr>
              </Thead>
              <Tbody>
                {(data.lowStockProducts ?? []).map((p: { id: string; name: string; stock: number; status: string }) => (
                  <Tr key={p.id}>
                    <Td><span className="font-medium">{p.name}</span></Td>
                    <Td><span className={`font-mono text-sm font-bold ${p.stock <= 2 ? 'text-red-400' : 'text-yellow-400'}`}>{p.stock}</span></Td>
                    <Td><ProductStatusBadge status={p.status} /></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Card>
        )}
      </div>
    </>
  )
}
