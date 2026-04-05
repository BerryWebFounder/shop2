import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const svc = createServiceClient()
    const { data, error } = await svc
      .from('settlements')
      .select('*, store:seller_stores(store_name)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error('[GET /api/admin/settlements]', err)
    return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  }
}
