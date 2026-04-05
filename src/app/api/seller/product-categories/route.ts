import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET: 특정 상점의 카테고리 목록
export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('store_id')
  if (!storeId) return NextResponse.json({ error: 'store_id 필요' }, { status: 400 })
  const svc = createServiceClient()
  const { data, error } = await svc
    .from('seller_product_categories')
    .select('*').eq('store_id', storeId).order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}

// POST: 카테고리 추가
export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.store_id || !body.name?.trim())
    return NextResponse.json({ error: 'store_id, name 필요' }, { status: 400 })
  const svc = createServiceClient()
  const { data, error } = await svc
    .from('seller_product_categories')
    .insert({ store_id: body.store_id, name: body.name.trim(), sort_order: body.sort_order ?? 0 })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
