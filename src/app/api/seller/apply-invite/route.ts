// ================================================================
// POST /api/seller/apply-invite
// 이메일 입력 → 48시간 유효 토큰 생성 → QR + 링크 포함 메일 발송
// ================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import { Resend }                    from 'resend'
import QRCode                        from 'qrcode'
import { v4 as uuidv4 }             from 'uuid'
import { z }                         from 'zod'
import { sellerInviteEmail }         from '@/lib/email/templates'

const schema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력하세요'),
})

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { email } = parsed.data

    // ── 1. 토큰 생성 ────────────────────────────────────────────
    const token     = uuidv4().replace(/-/g, '')
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

    // ── 2. DB 저장 ──────────────────────────────────────────────
    const svc = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    await svc
      .from('seller_apply_tokens')
      .update({ expires_at: new Date().toISOString() })
      .eq('email', email)
      .is('used_at', null)

    const { error: dbErr } = await svc
      .from('seller_apply_tokens')
      .insert({ token, email, expires_at: expiresAt.toISOString() })

    if (dbErr) throw dbErr

    // ── 3. 신청 URL + QR 생성 ───────────────────────────────────
    const baseUrl  = process.env.NEXT_PUBLIC_SITE_URL
      ?? `https://${req.headers.get('host')}`
    const applyUrl = `${baseUrl}/seller/apply/${token}`

    const qrDataUrl = await QRCode.toDataURL(applyUrl, {
      width:                300,
      margin:               2,
      color: { dark: '#1f2937', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })

    // ── 4. 메일 발송 ─────────────────────────────────────────────
    const resend = new Resend(process.env.RESEND_API_KEY!)

    const { error: mailErr } = await resend.emails.send({
      from:    process.env.RESEND_FROM_EMAIL!,
      to:      email,
      subject: '[소호몰] 개설 신청 링크가 도착했습니다 (48시간 유효)',
      html:    sellerInviteEmail({ applyUrl, qrDataUrl }),
    })

    if (mailErr) {
      console.error('[apply-invite] Resend error:', mailErr)
      await svc.from('seller_apply_tokens').delete().eq('token', token)
      return NextResponse.json({ error: '메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 })
    }

    return NextResponse.json({ message: '신청 링크를 이메일로 발송했습니다.' })

  } catch (err) {
    console.error('[apply-invite]', err)
    return NextResponse.json({ error: '오류가 발생했습니다.' }, { status: 500 })
  }
}
