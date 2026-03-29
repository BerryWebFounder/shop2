import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const page      = parseInt(searchParams.get('page')      || '1')
    const limit     = parseInt(searchParams.get('limit')     || '20')
    const q         = searchParams.get('q')         || ''
    const status    = searchParams.get('status')    || ''
    const date_from = searchParams.get('date_from') || ''
    const date_to   = searchParams.get('date_to')   || ''
    const offset    = (page - 1) * limit

    // 주문 목록 + 회원 정보 + 상품 수 집계
    let query = supabase
      .from('orders')
      .select(`
        id,
        order_no,
        member_id,
        total_amount,
        status,
        shipping_name,
        created_at,
        updated_at,
        member:members!member_id (
          id, name, email, phone
        ),
        item_count:order_items(count)
      `, { count: 'exact' })

    // 주문번호 / 배송지 이름 검색
    if (q) {
      query = query.or(
        `order_no.ilike.%${q}%,shipping_name.ilike.%${q}%`
      )
    }
    if (status)    query = query.eq('status', status)
    if (date_from) query = query.gte('created_at', date_from)
    if (date_to)   query = query.lte('created_at', date_to + 'T23:59:59')

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, count, error } = await query
    if (error) throw error

    // item_count를 숫자로 정규화
    const normalized = (data ?? []).map((o: Record<string, unknown>) => ({
      ...o,
      item_count: Array.isArray(o.item_count)
        ? (o.item_count as Array<{ count: number }>)[0]?.count ?? 0
        : 0,
      member_name:  (o.member as { name?: string } | null)?.name  ?? null,
      member_email: (o.member as { email?: string } | null)?.email ?? null,
    }))

    return NextResponse.json({
      data:  normalized,
      total: count ?? 0,
      page,
      limit,
    })
  } catch (err) {
    console.error('[GET /api/orders]', err)
    return NextResponse.json(
      { error: '주문 목록 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}
