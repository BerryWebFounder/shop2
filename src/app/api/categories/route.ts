import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { categorySchema } from '@/lib/validations'

export async function GET() {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('level')
      .order('sort_order')

    if (error) throw error

    // 트리 구조로 변환
    const roots = data?.filter(c => !c.parent_id) ?? []
    const tree = roots.map(root => ({
      ...root,
      children: (data?.filter(c => c.parent_id === root.id) ?? []).map(mid => ({
        ...mid,
        children: data?.filter(c => c.parent_id === mid.id) ?? [],
      })),
    }))

    return NextResponse.json({ data: tree, flat: data ?? [] })
  } catch (err) {
    console.error('[GET /api/categories]', err)
    return NextResponse.json({ error: '분류 조회에 실패했습니다' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const parsed = categorySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('categories')
      .insert(parsed.data)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data, message: '분류가 등록되었습니다' }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/categories]', err)
    return NextResponse.json({ error: '분류 등록에 실패했습니다' }, { status: 500 })
  }
}
