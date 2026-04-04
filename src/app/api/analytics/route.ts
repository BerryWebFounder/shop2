import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)

    const period  = searchParams.get('period')  || '30'   // 일 수
    const section = searchParams.get('section') || 'all'  // all | revenue | members | products

    const days = Math.min(Math.max(parseInt(period) || 30, 7), 365)
    const from = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10)
    const to   = new Date().toISOString().slice(0, 10)

    // 요청 섹션에 따라 필요한 데이터만 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calls: Record<string, PromiseLike<{ data: any; error: any }>> = {}

    if (section === 'all' || section === 'revenue') {
      calls.dailyRevenue    = supabase.rpc('analytics_daily_revenue',    { p_from: from, p_to: to })
      calls.monthlyRevenue  = supabase.rpc('analytics_monthly_revenue',  { p_months: 12 })
      calls.byWeekday       = supabase.rpc('analytics_by_weekday',       { p_from: from, p_to: to })
      calls.byHour          = supabase.rpc('analytics_by_hour',          { p_from: from, p_to: to })
      calls.byCategory      = supabase.rpc('analytics_by_category',      { p_from: from, p_to: to })
      calls.orderStatusDist = supabase.rpc('analytics_order_status_dist',{ p_from: from, p_to: to })
    }

    if (section === 'all' || section === 'members') {
      calls.memberGrowth     = supabase.rpc('analytics_member_growth',     { p_from: from, p_to: to })
      calls.memberStatusDist = supabase.rpc('analytics_member_status_dist')
    }

    if (section === 'all' || section === 'products') {
      calls.stockStatus  = supabase.rpc('analytics_stock_status')
      calls.topProducts  = supabase.rpc('analytics_top_products', { p_from: from, p_to: to, p_limit: 10 })
    }

    // 병렬 실행
    const results = await Promise.all(
      Object.entries(calls).map(async ([key, promise]) => {
        const { data, error } = await promise
        if (error) console.warn(`[analytics] ${key} error:`, error)
        return [key, data ?? []]
      })
    )

    const data = Object.fromEntries(results)

    // 집계 통계 계산
    if (data.dailyRevenue) {
      const rows = data.dailyRevenue as Array<{ revenue: number; order_count: number }>
      data.summary = {
        total_revenue: rows.reduce((s, r) => s + Number(r.revenue), 0),
        total_orders:  rows.reduce((s, r) => s + Number(r.order_count), 0),
        avg_daily_revenue: rows.length > 0
          ? Math.round(rows.reduce((s, r) => s + Number(r.revenue), 0) / rows.length)
          : 0,
      }
    }

    return NextResponse.json({ data, period: days, from, to })
  } catch (err) {
    console.error('[GET /api/analytics]', err)
    return NextResponse.json({ error: '분석 데이터 조회에 실패했습니다' }, { status: 500 })
  }
}
