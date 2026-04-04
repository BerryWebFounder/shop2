import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { productSchema } from '@/lib/validations'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        cat1:categories!cat1_id(id, name),
        cat2:categories!cat2_id(id, name),
        cat3:categories!cat3_id(id, name),
        images:product_images(id, public_url, is_main, sort_order)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('[GET /api/products/:id] error:', error)
      return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: 500 })
    }
    if (!data) return NextResponse.json({ error: '상품을 찾을 수 없습니다' }, { status: 404 })

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[GET /api/products/:id]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServiceClient()
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
    const supabase = createServiceClient()

    await supabase.from('display_items').delete().eq('product_id', id)
    await supabase.from('product_images').delete().eq('product_id', id)

    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ message: '상품이 삭제되었습니다' })
  } catch (err) {
    console.error('[DELETE /api/products/:id]', err)
    return NextResponse.json({ error: '상품 삭제에 실패했습니다' }, { status: 500 })
  }
}
