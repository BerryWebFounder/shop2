import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const date_from = searchParams.get('date_from') || ''
    const date_to   = searchParams.get('date_to')   || ''

    // 기간 필터 기본값: 최근 30일
    const from = date_from
      ? new Date(date_from).toISOString()
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const to = date_to
      ? new Date(date_to + 'T23:59:59').toISOString()
      : new Date().toISOString()

    const [
      { data: byStatus },
      { data: daily },
      { data: topProducts },
    ] = await Promise.all([
      // 상태별 주문 수 / 금액
      supabase.rpc('order_stats_by_status', { p_from: from, p_to: to }),

      // 일별 매출 (최근 30일)
      supabase.rpc('order_stats_daily', { p_from: from, p_to: to }),

      // 인기 상품 Top 5
      supabase.rpc('order_top_products', { p_from: from, p_to: to, p_limit: 5 }),
    ])

    return NextResponse.json({
      data: {
        by_status:    byStatus    ?? [],
        daily:        daily       ?? [],
        top_products: topProducts ?? [],
      },
    })
  } catch (err) {
    console.error('[GET /api/orders/stats]', err)
    // RPC 함수가 없을 경우 빈 데이터 반환 (graceful degradation)
    return NextResponse.json({
      data: { by_status: [], daily: [], top_products: [] },
    })
  }
}
