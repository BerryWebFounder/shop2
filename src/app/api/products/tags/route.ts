import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const tagSchema = z.object({
  name:  z.string().min(1).max(30),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default('#4f8ef7'),
})

// ── 태그 목록 ─────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''

  let query = supabase.from('product_tags').select('*').order('use_count', { ascending: false })
  if (q) query = query.ilike('name', `%${q}%`)

  const { data, error } = await query
  if (error) throw error
  return NextResponse.json({ data: data ?? [] })
}

// ── 태그 생성 ─────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body   = await request.json()
    const parsed = tagSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

    const slug = parsed.data.name
      .toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9가-힣-]/g, '')

    const { data, error } = await supabase
      .from('product_tags')
      .insert({ ...parsed.data, slug })
      .select().single()

    if (error?.code === '23505') {
      return NextResponse.json({ error: '이미 존재하는 태그입니다' }, { status: 409 })
    }
    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/products/tags]', err)
    return NextResponse.json({ error: '태그 등록에 실패했습니다' }, { status: 500 })
  }
}
