import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const svc = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // storage_path 먼저 조회
    const { data: img } = await svc
      .from('product_images')
      .select('storage_path')
      .eq('id', id)
      .single()

    // Storage에서 삭제
    if (img?.storage_path) {
      await svc.storage.from('product-images').remove([img.storage_path])
    }

    // DB에서 삭제
    const { error } = await svc.from('product_images').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ message: '삭제됐습니다.' })
  } catch (err) {
    console.error('[DELETE /api/product-images/:id]', err)
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
  }
}
