import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { eventSchema } from '@/lib/validations'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()
    const parsed = eventSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('events')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data, message: '이벤트가 수정되었습니다' })
  } catch (err) {
    console.error('[PUT /api/events/:id]', err)
    return NextResponse.json({ error: '이벤트 수정에 실패했습니다' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ message: '이벤트가 삭제되었습니다' })
  } catch (err) {
    console.error('[DELETE /api/events/:id]', err)
    return NextResponse.json({ error: '이벤트 삭제에 실패했습니다' }, { status: 500 })
  }
}
