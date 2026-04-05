import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const svc = createServiceClient()
  const { data, error } = await svc
    .from('store_categories').select('*').order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: '카테고리명을 입력하세요.' }, { status: 400 })
  const svc = createServiceClient()
  const { data, error } = await svc
    .from('store_categories').insert({ name: body.name.trim(), sort_order: body.sort_order ?? 0 })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
