// src/app/api/display/banners/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

function isLive(row: { is_active: boolean; starts_at: string | null; ends_at: string | null }) {
  if (!row.is_active) return false
  const now = new Date()
  if (row.starts_at && new Date(row.starts_at) > now) return false
  if (row.ends_at   && new Date(row.ends_at)   < now) return false
  return true
}

const bannerSchema = z.object({
  zone:          z.string().default('main'),
  position:      z.enum(['full','half','third','quarter']).default('full'),
  title:         z.string().optional().nullable(),
  subtitle:      z.string().optional().nullable(),
  image_url:     z.string().url(),
  image_mobile:  z.string().url().optional().nullable(),
  link_url:      z.string().optional().nullable(),
  badge_text:    z.string().max(20).optional().nullable(),
  badge_color:   z.string().default('#c4503a'),
  overlay_color: z.string().default('rgba(0,0,0,0)'),
  text_position: z.enum(['top-left','center','bottom-left','bottom-right']).default('bottom-left'),
  text_color:    z.string().default('#ffffff'),
  starts_at:     z.string().datetime().optional().nullable(),
  ends_at:       z.string().datetime().optional().nullable(),
  is_active:     z.boolean().default(true),
  sort_order:    z.number().int().default(0),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const zone     = searchParams.get('zone') || 'main'
  const isAdmin  = searchParams.get('admin') === 'true'
  const liveOnly = searchParams.get('live')  === 'true'
  const { data } = await supabase.from('display_banners').select('*')
    .eq('zone', zone).order('sort_order')
  const items = isAdmin ? (data ?? []) : (data ?? []).filter(b => !liveOnly || isLive(b))
  return NextResponse.json({ data: items })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body   = await request.json()
  const parsed = bannerSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  const { data, error } = await supabase.from('display_banners').insert(parsed.data).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { id, ...body } = await request.json()
  const { data, error } = await supabase.from('display_banners').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { id } = await request.json()
  await supabase.from('display_banners').delete().eq('id', id)
  return NextResponse.json({ message: '삭제되었습니다' })
}
