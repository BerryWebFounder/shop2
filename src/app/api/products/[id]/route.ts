import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { productSchema } from '@/lib/validations'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        cat1:categories!cat1_id(*),
        cat2:categories!cat2_id(*),
        cat3:categories!cat3_id(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: '상품을 찾을 수 없습니다' }, { status: 404 })

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[GET /api/products/:id]', err)
    return NextResponse.json({ error: '상품 조회에 실패했습니다' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()
    const parsed = productSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('products')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data, message: '상품이 수정되었습니다' })
  } catch (err) {
    console.error('[PUT /api/products/:id]', err)
    return NextResponse.json({ error: '상품 수정에 실패했습니다' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // 전시 중인 상품이면 전시에서도 제거
    await supabase.from('display_items').delete().eq('product_id', id)

    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ message: '상품이 삭제되었습니다' })
  } catch (err) {
    console.error('[DELETE /api/products/:id]', err)
    return NextResponse.json({ error: '상품 삭제에 실패했습니다' }, { status: 500 })
  }
}
