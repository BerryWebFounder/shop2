import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const supabase = createServiceClient()
    const { data } = await supabase.rpc('expire_points')
    return NextResponse.json({ ok: true, expired: data ?? [] })
  } catch (err) {
    console.error('[CRON /points]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
