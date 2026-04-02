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
    // ── 0. 환경변수 사전 검증 ────────────────────────────────────
    const missingVars: string[] = []
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL)   missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY)  missingVars.push('SUPABASE_SERVICE_ROLE_KEY')
    if (!process.env.RESEND_API_KEY)             missingVars.push('RESEND_API_KEY')

    if (missingVars.length > 0) {
      console.error('[apply-invite] 환경변수 누락:', missingVars)
      return NextResponse.json(
        { error: `서버 설정 오류: ${missingVars.join(', ')} 환경변수가 없습니다.` },
        { status: 500 }
      )
    }

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

    // 기존 미사용 토큰 무효화
    await svc
      .from('seller_apply_tokens')
      .update({ expires_at: new Date().toISOString() })
      .eq('email', email)
      .is('used_at', null)

    const { error: dbErr } = await svc
      .from('seller_apply_tokens')
      .insert({ token, email, expires_at: expiresAt.toISOString() })

    if (dbErr) {
      console.error('[apply-invite] DB 오류:', dbErr)
      // seller_apply_tokens 테이블이 없는 경우
      if (dbErr.code === '42P01') {
        return NextResponse.json(
          { error: 'DB 테이블이 없습니다. apply-token-table.sql을 Supabase에서 실행해 주세요.' },
          { status: 500 }
        )
      }
      return NextResponse.json({ error: `DB 오류: ${dbErr.message}` }, { status: 500 })
    }

    // ── 3. 신청 URL + QR 생성 ───────────────────────────────────
    const baseUrl  = process.env.NEXT_PUBLIC_SITE_URL
      ?? `https://${req.headers.get('host')}`
    const applyUrl = `${baseUrl}/seller/apply/${token}`

    const qrDataUrl = await QRCode.toDataURL(applyUrl, {
      width:           300,
      margin:          2,
      color: { dark: '#1f2937', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })

    // ── 4. 메일 발송 ─────────────────────────────────────────────
    const resend   = new Resend(process.env.RESEND_API_KEY!)
    const fromAddr = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

    const { data: mailData, error: mailErr } = await resend.emails.send({
      from:    fromAddr,
      to:      email,
      subject: '[소호몰] 개설 신청 링크가 도착했습니다 (48시간 유효)',
      html:    sellerInviteEmail({ applyUrl, qrDataUrl }),
    })

    if (mailErr) {
      console.error('[apply-invite] Resend 오류:', JSON.stringify(mailErr))
      // 토큰 삭제 (메일 실패 시 재시도 가능하도록)
      await svc.from('seller_apply_tokens').delete().eq('token', token)
      return NextResponse.json(
        { error: `메일 발송 실패: ${(mailErr as { message?: string }).message ?? JSON.stringify(mailErr)}` },
        { status: 500 }
      )
    }

    console.log('[apply-invite] 메일 발송 성공:', mailData?.id, '→', email)
    return NextResponse.json({ message: '신청 링크를 이메일로 발송했습니다.' })

  } catch (err) {
    console.error('[apply-invite] 예외:', err)
    return NextResponse.json(
      { error: `오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
