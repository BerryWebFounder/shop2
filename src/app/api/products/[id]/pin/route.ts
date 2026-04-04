import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/server'

// ── 상품 철하/고정 토글 ───────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient()
    const { is_pinned } = await request.json() as { is_pinned: boolean }

    const { data, error } = await supabase
      .from('products')
      .update({
        is_pinned,
        pinned_at:    is_pinned ? new Date().toISOString() : null,
        pinned_order: is_pinned ? Date.now() : 0,  // 최근 고정이 상단
      })
      .eq('id', id)
      .select('id, name, is_pinned')
      .single()

    if (error) throw error
    return NextResponse.json({
      data,
      message: is_pinned ? '상품이 고정되었습니다' : '상품 고정이 해제되었습니다',
    })
  } catch (err) {
    console.error('[PATCH /api/products/:id/pin]', err)
    return NextResponse.json({ error: '처리에 실패했습니다' }, { status: 500 })
  }
}
