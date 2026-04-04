import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { productSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)

    const page   = parseInt(searchParams.get('page')   || '1')
    const limit  = parseInt(searchParams.get('limit')  || '20')
    const q      = searchParams.get('q')      || ''
    const status = searchParams.get('status') || ''
    const cat1   = searchParams.get('cat1')   || ''
    const offset = (page - 1) * limit

    let query = supabase
      .from('products')
      .select(`
        id, serial_no, name, price, sale_price, stock, status, created_at,
        cat1:categories!cat1_id(id, name),
        cat2:categories!cat2_id(id, name),
        cat3:categories!cat3_id(id, name)
      `, { count: 'exact' })

    if (q)      query = query.or(`name.ilike.%${q}%,serial_no.ilike.%${q}%`)
    if (status) query = query.eq('status', status)
    if (cat1)   query = query.eq('cat1_id', cat1)

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data, count, error } = await query
    if (error) throw error

    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit })
  } catch (err) {
    console.error('[GET /api/products]', err)
    return NextResponse.json({ error: '상품 목록 조회에 실패했습니다' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const parsed = productSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    // serial_no는 DB 트리거(trg_set_serial_no)가 자동 생성
    const { data, error } = await supabase
      .from('products')
      .insert(parsed.data)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data, message: '상품이 등록되었습니다' }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/products]', err)
    return NextResponse.json({ error: '상품 등록에 실패했습니다' }, { status: 500 })
  }
}
