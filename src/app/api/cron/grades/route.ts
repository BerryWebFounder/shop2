import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Vercel Cron: 매일 01:00 KST (UTC 16:00)
// vercel.json: { "path": "/api/cron/grades", "schedule": "0 16 * * *" }

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase.rpc('update_all_member_grades')
    if (error) throw error

    const changed = (data ?? []) as Array<{ member_id: string; old_grade: string; new_grade: string }>
    console.log(`[Cron] 등급 업데이트 완료: ${changed.length}명 변경`)

    return NextResponse.json({
      ok:      true,
      changed: changed.length,
      details: changed,
    })
  } catch (err) {
    console.error('[Cron /api/cron/grades]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
