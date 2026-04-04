import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { displaySchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || ''

    let query = supabase
      .from('display_items')
      .select(`
        *,
        product:products!product_id(id, serial_no, name, price, sale_price, stock, status),
        event:events!event_id(id, name, start_date, end_date, status)
      `)
      .order('sort_order')

    if (type) query = query.eq('display_type', type)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error('[GET /api/display]', err)
    return NextResponse.json({ error: '전시 목록 조회에 실패했습니다' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const parsed = displaySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    // 이벤트 전시인데 event_id가 없으면 오류
    if (parsed.data.display_type === 'event' && !parsed.data.event_id) {
      return NextResponse.json({ error: '이벤트 전시는 이벤트를 선택해야 합니다' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('display_items')
      .insert(parsed.data)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data, message: '전시 상품이 등록되었습니다' }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/display]', err)
    return NextResponse.json({ error: '전시 등록에 실패했습니다' }, { status: 500 })
  }
}
