import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient()
    const body = await request.json()

    const { data, error } = await supabase
      .from('display_items')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data, message: '전시 정보가 수정되었습니다' })
  } catch (err) {
    console.error('[PATCH /api/display/:id]', err)
    return NextResponse.json({ error: '전시 수정에 실패했습니다' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient()
    const { error } = await supabase.from('display_items').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ message: '전시가 삭제되었습니다' })
  } catch (err) {
    console.error('[DELETE /api/display/:id]', err)
    return NextResponse.json({ error: '전시 삭제에 실패했습니다' }, { status: 500 })
  }
}
