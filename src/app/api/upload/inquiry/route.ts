import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BUCKET      = 'inquiry-attachments'
const MAX_SIZE_MB  = 10
const ALLOWED_TYPES = ['image/jpeg','image/png','image/webp','image/gif','application/pdf']

export async function POST(request: NextRequest) {
  try {
    const supabase  = await createClient()
    const formData  = await request.formData()
    const file      = formData.get('file') as File | null
    const inquiryId = (formData.get('inquiryId') as string) || 'temp'

    if (!file) return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'JPG·PNG·WEBP·GIF·PDF 파일만 업로드 가능합니다' },
        { status: 400 }
      )
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `파일 크기는 ${MAX_SIZE_MB}MB 이하여야 합니다` },
        { status: 400 }
      )
    }

    const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path     = `inquiries/${inquiryId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const uint8Arr = new Uint8Array(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, uint8Arr, { contentType: file.type, upsert: false })

    if (uploadError) throw uploadError

    // 서명 URL 생성 (1시간 유효)
    const { data: signedData } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600)
    const signedUrl = signedData?.signedUrl ?? ''

    return NextResponse.json({ path, signedUrl, message: '업로드 완료' }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/upload/inquiry]', err)
    return NextResponse.json({ error: '파일 업로드에 실패했습니다' }, { status: 500 })
  }
}
