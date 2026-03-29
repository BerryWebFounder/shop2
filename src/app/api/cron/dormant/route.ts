import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Vercel Cron: 매일 자정 실행 (vercel.json 설정)
export async function POST(request: NextRequest) {
  // 보안 토큰 검증
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()

    // 설정에서 휴면 기준일 조회
    const { data: settings } = await supabase
      .from('admin_settings')
      .select('dormant_days')
      .single()

    const dormantDays = settings?.dormant_days ?? 365

    // 기준일 이상 미접속 활성 회원 → 휴면 전환
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - dormantDays)

    const { data: targets, error: fetchError } = await supabase
      .from('members')
      .select('id, name, email')
      .eq('status', 'active')
      .lt('last_login', cutoffDate.toISOString())

    if (fetchError) throw fetchError

    if (!targets || targets.length === 0) {
      return NextResponse.json({ message: '휴면 전환 대상 없음', converted: 0 })
    }

    const ids = targets.map(m => m.id)

    const { error: updateError } = await supabase
      .from('members')
      .update({
        status: 'dormant',
        dormant_date: new Date().toISOString(),
      })
      .in('id', ids)

    if (updateError) throw updateError

    console.log(`[CRON] 휴면 전환 완료: ${targets.length}명`)

    return NextResponse.json({
      message: '휴면 전환 완료',
      converted: targets.length,
      cutoff_date: cutoffDate.toISOString(),
    })
  } catch (err) {
    console.error('[CRON /dormant]', err)
    return NextResponse.json({ error: '휴면 전환 실패' }, { status: 500 })
  }
}
