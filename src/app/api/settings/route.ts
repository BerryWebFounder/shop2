import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { settingsSchema } from '@/lib/validations'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('admin_settings')
      .select('id, store_name, biz_no, address, phone, email, dormant_days, data_keep_years, updated_at')
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return NextResponse.json({ data: data ?? null })
  } catch (err) {
    console.error('[GET /api/settings]', err)
    return NextResponse.json({ error: '설정 조회에 실패했습니다' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const parsed = settingsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    // upsert: 없으면 insert, 있으면 update
    const { data: existing } = await supabase
      .from('admin_settings')
      .select('id')
      .single()

    let result
    if (existing?.id) {
      result = await supabase
        .from('admin_settings')
        .update(parsed.data)
        .eq('id', existing.id)
        .select()
        .single()
    } else {
      result = await supabase
        .from('admin_settings')
        .insert({ ...parsed.data, admin_id: 'admin', admin_pw_hash: '' })
        .select()
        .single()
    }

    if (result.error) throw result.error
    return NextResponse.json({ data: result.data, message: '설정이 저장되었습니다' })
  } catch (err) {
    console.error('[PUT /api/settings]', err)
    return NextResponse.json({ error: '설정 저장에 실패했습니다' }, { status: 500 })
  }
}
