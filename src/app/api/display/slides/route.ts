import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const slideSchema = z.object({
  title:         z.string().max(100).optional().nullable(),
  subtitle:      z.string().max(200).optional().nullable(),
  description:   z.string().max(500).optional().nullable(),
  image_url:     z.string().url('이미지 URL을 입력하세요'),
  image_mobile:  z.string().url().optional().nullable(),
  overlay_color: z.string().default('rgba(0,0,0,0.35)'),
  cta_text:      z.string().max(30).optional().nullable(),
  cta_url:       z.string().max(500).optional().nullable(),
  cta_style:     z.enum(['light','dark','outline']).default('light'),
  text_align:    z.enum(['left','center','right']).default('center'),
  text_color:    z.string().default('#ffffff'),
  starts_at:     z.string().datetime().optional().nullable(),
  ends_at:       z.string().datetime().optional().nullable(),
  is_active:     z.boolean().default(true),
  sort_order:    z.number().int().default(0),
})

// 활성화 조건 헬퍼 (기간 포함)
function isLive(row: { is_active: boolean; starts_at: string | null; ends_at: string | null }): boolean {
  if (!row.is_active) return false
  const now = new Date()
  if (row.starts_at && new Date(row.starts_at) > now) return false
  if (row.ends_at   && new Date(row.ends_at)   < now) return false
  return true
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const isAdmin  = searchParams.get('admin') === 'true'
    const liveOnly = searchParams.get('live')  === 'true'

    const { data, error } = await supabase
      .from('display_slides')
      .select('*')
      .order('sort_order')
      .order('created_at', { ascending: false })

    if (error) throw error

    const items = isAdmin ? (data ?? []) :
      (data ?? []).filter(s => !liveOnly || isLive(s))

    return NextResponse.json({ data: items })
  } catch (err) {
    console.error('[GET /api/display/slides]', err)
    return NextResponse.json({ error: '슬라이드 조회에 실패했습니다' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body   = await request.json()
    const parsed = slideSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

    const { data, error } = await supabase.from('display_slides').insert(parsed.data).select().single()
    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/display/slides]', err)
    return NextResponse.json({ error: '슬라이드 생성에 실패했습니다' }, { status: 500 })
  }
}
