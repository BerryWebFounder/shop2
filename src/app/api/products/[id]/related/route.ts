import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/server'

// ── 연관 상품 조회 ─────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createClient()

  const { data } = await supabase
    .from('product_relations')
    .select('related_id, sort_order, product:products!related_id(id, name, price, sale_price)')
    .eq('product_id', id)
    .order('sort_order')

  return NextResponse.json({ data: data ?? [] })
}

// ── 연관 상품 저장 ─────────────────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient()
    const { relatedIds } = await request.json() as { relatedIds: string[] }

    if (relatedIds.includes(id)) {
      return NextResponse.json({ error: '자기 자신을 연관 상품으로 추가할 수 없습니다' }, { status: 400 })
    }

    await supabase.from('product_relations').delete().eq('product_id', id)

    if (relatedIds.length > 0) {
      await supabase.from('product_relations').insert(
        relatedIds.map((related_id, i) => ({ product_id: id, related_id, sort_order: i }))
      )
    }

    return NextResponse.json({ message: '연관 상품이 업데이트되었습니다' })
  } catch (err) {
    console.error('[PUT /api/products/:id/related]', err)
    return NextResponse.json({ error: '연관 상품 저장에 실패했습니다' }, { status: 500 })
  }
}
