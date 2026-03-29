import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Vercel Cron: 매일 01:00 실행
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()
    const today = new Date().toISOString().slice(0, 10)

    // 시작일 도래 → scheduled → active
    const { data: toActive } = await supabase
      .from('events')
      .update({ status: 'active' })
      .eq('status', 'scheduled')
      .lte('start_date', today)
      .gte('end_date', today)
      .select('id')

    // 종료일 지남 → active/scheduled → ended
    const { data: toEnded } = await supabase
      .from('events')
      .update({ status: 'ended' })
      .in('status', ['active', 'scheduled'])
      .lt('end_date', today)
      .select('id')

    console.log(`[CRON] 이벤트 활성화: ${toActive?.length ?? 0}건, 종료: ${toEnded?.length ?? 0}건`)

    return NextResponse.json({
      activated: toActive?.length ?? 0,
      ended: toEnded?.length ?? 0,
    })
  } catch (err) {
    console.error('[CRON /events]', err)
    return NextResponse.json({ error: '이벤트 상태 갱신 실패' }, { status: 500 })
  }
}
