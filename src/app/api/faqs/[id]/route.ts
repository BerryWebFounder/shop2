import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateSchema = z.object({
  question:   z.string().min(1).max(300).optional(),
  answer:     z.string().min(1).max(5000).optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active:  z.boolean().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient()
    const body   = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('faqs').update(parsed.data).eq('id', id).select().single()

    if (error) throw error
    return NextResponse.json({ data, message: 'FAQ가 수정되었습니다' })
  } catch (err) {
    console.error('[PUT /api/faqs/:id]', err)
    return NextResponse.json({ error: 'FAQ 수정에 실패했습니다' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient()
    const { error } = await supabase.from('faqs').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ message: 'FAQ가 삭제되었습니다' })
  } catch (err) {
    console.error('[DELETE /api/faqs/:id]', err)
    return NextResponse.json({ error: 'FAQ 삭제에 실패했습니다' }, { status: 500 })
  }
}
