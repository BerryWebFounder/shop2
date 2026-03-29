import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const popupSchema = z.object({
  title:        z.string().optional().nullable(),
  body:         z.string().optional().nullable(),
  image_url:    z.string().url().optional().nullable(),
  link_url:     z.string().optional().nullable(),
  link_text:    z.string().default('자세히 보기'),
  width:        z.number().int().min(200).max(800).default(480),
  position:     z.enum(['center','bottom-left','bottom-right']).default('center'),
  show_close:   z.boolean().default(true),
  close_text:   z.string().default('닫기'),
  dismiss_days: z.number().int().min(0).max(365).default(1),
  dismiss_text: z.string().default('오늘 하루 안 보기'),
  starts_at:    z.string().datetime().optional().nullable(),
  ends_at:      z.string().datetime().optional().nullable(),
  is_active:    z.boolean().default(true),
  sort_order:   z.number().int().default(0),
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
  const { searchParams } = new URL(request.url)
  const isAdmin  = searchParams.get('admin') === 'true'
  const liveOnly = searchParams.get('live')  === 'true'
  const { data } = await supabase.from('display_popups').select('*').order('sort_order')
  const items = isAdmin ? (data ?? []) : (data ?? []).filter(p => !liveOnly || isLive(p))
  return NextResponse.json({ data: items })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const parsed = popupSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  const { data, error } = await supabase.from('display_popups').insert(parsed.data).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { id, ...body } = await request.json()
  const { data, error } = await supabase.from('display_popups').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { id } = await request.json()
  await supabase.from('display_popups').delete().eq('id', id)
  return NextResponse.json({ message: '삭제되었습니다' })
}
