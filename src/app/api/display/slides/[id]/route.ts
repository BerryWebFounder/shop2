import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = createClient()
    const body = await request.json()
    const { data, error } = await supabase.from('display_slides').update(body).eq('id', id).select().single()
    if (error) throw error
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: '수정에 실패했습니다' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = createClient()
    await supabase.from('display_slides').delete().eq('id', id)
    return NextResponse.json({ message: '삭제되었습니다' })
  } catch (err) {
    return NextResponse.json({ error: '삭제에 실패했습니다' }, { status: 500 })
  }
}
