import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { tagIds } = await request.json() as { tagIds: string[] }

    // 기존 태그 삭제 후 재등록
    await supabase.from('product_tag_map').delete().eq('product_id', id)
    if (tagIds.length > 0) {
      await supabase.from('product_tag_map').insert(
        tagIds.map(tag_id => ({ product_id: id, tag_id }))
      )
    }
    return NextResponse.json({ message: '태그가 업데이트되었습니다' })
  } catch (err) {
    console.error('[PUT /api/products/:id/tags]', err)
    return NextResponse.json({ error: '태그 업데이트에 실패했습니다' }, { status: 500 })
  }
}
