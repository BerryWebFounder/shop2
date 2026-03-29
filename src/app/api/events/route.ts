import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { eventSchema } from '@/lib/validations'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: false })

    if (error) throw error
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error('[GET /api/events]', err)
    return NextResponse.json({ error: '이벤트 조회에 실패했습니다' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const parsed = eventSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('events')
      .insert(parsed.data)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data, message: '이벤트가 등록되었습니다' }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/events]', err)
    return NextResponse.json({ error: '이벤트 등록에 실패했습니다' }, { status: 500 })
  }
}
