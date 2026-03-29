import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

    const [
      { count: totalMembers },
      { count: newMembers },
      { count: todayOrders },
      { data: revenueData },
      { count: displayedProducts },
      { count: totalProducts },
      { count: lowStock },
      { data: recentOrders },
      { data: weeklySales },
      { data: lowStockProducts },
    ] = await Promise.all([
      supabase.from('members').select('*', { count: 'exact', head: true }).neq('status', 'withdrawn'),
      supabase.from('members').select('*', { count: 'exact', head: true }).gte('join_date', startOfMonth),
      supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', startOfToday),
      supabase.from('orders').select('total_amount').gte('created_at', startOfToday).not('status', 'eq', 'cancelled'),
      supabase.from('display_items').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }).lte('stock', 5).neq('status', 'stop'),
      supabase.from('orders').select('order_no, total_amount, status, created_at, member_id').order('created_at', { ascending: false }).limit(5),
      supabase.rpc('weekly_sales').limit(7),
      supabase.from('products').select('id, name, stock, status').lte('stock', 5).neq('status', 'stop').order('stock').limit(5),
    ])

    const todayRevenue = (revenueData ?? []).reduce((sum: number, o: { total_amount: number }) => sum + (o.total_amount || 0), 0)

    return NextResponse.json({
      data: {
        total_members: totalMembers ?? 0,
        new_members_this_month: newMembers ?? 0,
        today_orders: todayOrders ?? 0,
        today_revenue: todayRevenue,
        displayed_products: displayedProducts ?? 0,
        total_products: totalProducts ?? 0,
        low_stock_count: lowStock ?? 0,
        recent_orders: recentOrders ?? [],
        weekly_sales: weeklySales ?? [],
        low_stock_products: lowStockProducts ?? [],
      },
    })
  } catch (err) {
    console.error('[GET /api/dashboard]', err)
    return NextResponse.json({ error: '대시보드 데이터 조회에 실패했습니다' }, { status: 500 })
  }
}
