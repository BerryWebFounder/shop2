import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { categorySchema } from '@/lib/validations'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()
    const parsed = categorySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('categories')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data, message: '분류가 수정되었습니다' })
  } catch (err) {
    console.error('[PUT /api/categories/:id]', err)
    return NextResponse.json({ error: '분류 수정에 실패했습니다' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // 하위 분류가 있으면 삭제 불가
    const { count } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', id)

    if (count && count > 0) {
      return NextResponse.json({ error: '하위 분류가 있어 삭제할 수 없습니다. 먼저 하위 분류를 삭제해주세요.' }, { status: 400 })
    }

    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ message: '분류가 삭제되었습니다' })
  } catch (err) {
    console.error('[DELETE /api/categories/:id]', err)
    return NextResponse.json({ error: '분류 삭제에 실패했습니다' }, { status: 500 })
  }
}
