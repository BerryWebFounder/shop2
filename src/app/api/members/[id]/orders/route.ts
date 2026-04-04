import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const page  = parseInt(searchParams.get('page') || '1')
    const limit = 10
    const offset = (page - 1) * limit

    const { data, count, error } = await supabase
      .from('orders')
      .select(`
        id, order_no, status, total_amount,
        coupon_discount, point_used, created_at, paid_at,
        items:order_items(product_name, quantity, unit_price, sale_price)
      `, { count: 'exact' })
      .eq('member_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit })
  } catch (err) {
    console.error('[GET /api/members/:id/orders]', err)
    return NextResponse.json({ error: '주문 이력 조회에 실패했습니다' }, { status: 500 })
  }
}
