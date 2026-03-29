import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const promoSchema = z.object({
  message:    z.string().min(1, '문구를 입력하세요').max(500),
  link_url:   z.string().optional().nullable(),
  link_text:  z.string().optional().nullable(),
  bg_color:   z.string().default('#1A1A18'),
  text_color: z.string().default('#FAFAF8'),
  show_close: z.boolean().default(true),
  starts_at:  z.string().datetime().optional().nullable(),
  ends_at:    z.string().datetime().optional().nullable(),
  is_active:  z.boolean().default(true),
  sort_order: z.number().int().default(0),
})

function isLive(row: { is_active: boolean; starts_at: string | null; ends_at: string | null }) {
  if (!row.is_active) return false
  const now = new Date()
  if (row.starts_at && new Date(row.starts_at) > now) return false
  if (row.ends_at   && new Date(row.ends_at)   < now) return false
  return true
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const liveOnly = new URL(request.url).searchParams.get('live') === 'true'
  const { data } = await supabase.from('display_promo_bars').select('*').order('sort_order')
  const items = liveOnly ? (data ?? []).filter(isLive) : (data ?? [])
  return NextResponse.json({ data: items })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const parsed = promoSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  const { data, error } = await supabase.from('display_promo_bars').insert(parsed.data).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { id, ...body } = await request.json()
  const { data, error } = await supabase.from('display_promo_bars').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { id } = await request.json()
  await supabase.from('display_promo_bars').delete().eq('id', id)
  return NextResponse.json({ message: '삭제되었습니다' })
}
