import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateSchema = z.object({
  name:             z.string().min(1).max(100).optional(),
  description:      z.string().max(500).optional(),
  is_active:        z.boolean().optional(),
  valid_until:      z.string().nullable().optional(),
  usage_limit:      z.number().int().min(1).nullable().optional(),
  min_order_amount: z.number().int().min(0).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body   = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('coupons')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data, message: '쿠폰이 수정되었습니다' })
  } catch (err) {
    console.error('[PATCH /api/coupons/:id]', err)
    return NextResponse.json({ error: '쿠폰 수정에 실패했습니다' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // 사용 내역이 있으면 비활성화만 (물리 삭제 대신)
    const { count } = await supabase
      .from('coupon_usages')
      .select('*', { count: 'exact', head: true })
      .eq('coupon_id', id)

    if (count && count > 0) {
      await supabase.from('coupons').update({ is_active: false }).eq('id', id)
      return NextResponse.json({ message: '사용 내역이 있어 비활성화 처리되었습니다' })
    }

    const { error } = await supabase.from('coupons').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ message: '쿠폰이 삭제되었습니다' })
  } catch (err) {
    console.error('[DELETE /api/coupons/:id]', err)
    return NextResponse.json({ error: '쿠폰 삭제에 실패했습니다' }, { status: 500 })
  }
}
