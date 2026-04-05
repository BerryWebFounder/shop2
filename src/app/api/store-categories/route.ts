import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const svc = createServiceClient()
  const { data } = await svc
    .from('store_categories').select('id, name').eq('is_active', true).order('sort_order')
  return NextResponse.json({ data: data ?? [] })
}
