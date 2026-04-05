import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const svc = createServiceClient()
    const q   = new URL(req.url).searchParams.get('q') ?? ''
    let query = svc.from('seller_stores')
      .select('id, store_name, slug, category, owner_id, created_at')
      .order('created_at', { ascending: false })
    if (q) query = query.ilike('store_name', `%${q}%`)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error('[GET /api/admin/stores]', err)
    return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  }
}
