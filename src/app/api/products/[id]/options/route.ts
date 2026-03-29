import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ── 옵션 조회 ─────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: groups }, { data: skus }] = await Promise.all([
    supabase.from('product_option_groups')
      .select('*, values:product_option_values(*)')
      .eq('product_id', id)
      .order('sort_order'),
    supabase.from('product_skus')
      .select('*')
      .eq('product_id', id)
      .order('created_at'),
  ])

  return NextResponse.json({ groups: groups ?? [], skus: skus ?? [] })
}

// ── 옵션 그룹+값+SKU 일괄 저장 ────────────────────────────────────
const optionSchema = z.object({
  groups: z.array(z.object({
    name:   z.string().min(1),
    values: z.array(z.string().min(1)),
  })),
  skus: z.array(z.object({
    option_combo:      z.record(z.string()),
    option_combo_text: z.string(),
    price_offset:      z.number().int().default(0),
    stock:             z.number().int().min(0).default(0),
    sku_code:          z.string().optional(),
    is_active:         z.boolean().default(true),
  })),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body   = await request.json()
    const parsed = optionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    // 기존 데이터 전체 삭제 후 재생성 (CASCADE로 values, skus도 삭제)
    await supabase.from('product_option_groups').delete().eq('product_id', id)

    if (parsed.data.groups.length === 0) {
      return NextResponse.json({ message: '옵션이 삭제되었습니다' })
    }

    // 그룹 삽입
    const groupInserts = parsed.data.groups.map((g, i) => ({
      product_id: id, name: g.name, sort_order: i,
    }))
    const { data: insertedGroups } = await supabase
      .from('product_option_groups').insert(groupInserts).select()

    // 값 삽입
    const valueInserts = (insertedGroups ?? []).flatMap((group, gi) =>
      parsed.data.groups[gi].values.map((v, vi) => ({
        group_id: group.id, value: v, sort_order: vi,
      }))
    )
    if (valueInserts.length > 0) {
      await supabase.from('product_option_values').insert(valueInserts)
    }

    // SKU 삽입
    if (parsed.data.skus.length > 0) {
      const skuInserts = parsed.data.skus.map(sku => ({
        product_id: id, ...sku,
      }))
      await supabase.from('product_skus').insert(skuInserts)

      // SKU 총 재고로 상품 재고 업데이트
      const totalStock = parsed.data.skus.reduce((s, sku) => s + sku.stock, 0)
      await supabase.from('products').update({ stock: totalStock }).eq('id', id)
    }

    return NextResponse.json({ message: '옵션이 저장되었습니다' })
  } catch (err) {
    console.error('[PUT /api/products/:id/options]', err)
    return NextResponse.json({ error: '옵션 저장에 실패했습니다' }, { status: 500 })
  }
}

// ── SKU 재고만 업데이트 ───────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { skus } = await request.json() as {
      skus: Array<{ id: string; stock: number; price_offset?: number; is_active?: boolean }>
    }

    await Promise.all(
      skus.map(sku =>
        supabase.from('product_skus')
          .update({ stock: sku.stock, price_offset: sku.price_offset, is_active: sku.is_active })
          .eq('id', sku.id).eq('product_id', id)
      )
    )

    // 총 재고 업데이트
    const { data: allSkus } = await supabase
      .from('product_skus').select('stock').eq('product_id', id).eq('is_active', true)
    const totalStock = allSkus?.reduce((s, sku) => s + sku.stock, 0) ?? 0
    await supabase.from('products').update({ stock: totalStock }).eq('id', id)

    return NextResponse.json({ message: 'SKU가 업데이트되었습니다' })
  } catch (err) {
    console.error('[PATCH /api/products/:id/options]', err)
    return NextResponse.json({ error: 'SKU 업데이트에 실패했습니다' }, { status: 500 })
  }
}
