'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ShopRegisterPage() {
  const router = useRouter()
  const [form, setForm]     = useState({ email: '', password: '', confirm: '', name: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [done, setDone]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password.length < 8)            { setError('비밀번호는 8자 이상이어야 합니다.'); return }
    if (form.password !== form.confirm)      { setError('비밀번호가 일치하지 않습니다.'); return }
    if (!form.name.trim())                   { setError('이름을 입력해주세요.'); return }
    setLoading(true)

    const supabase = createClient()

    // Supabase Auth 가입
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email:    form.email,
      password: form.password,
      options:  { data: { name: form.name } },
    })

    if (authError) {
      setError(authError.message === 'User already registered'
        ? '이미 가입된 이메일입니다.' : '회원가입에 실패했습니다.')
      setLoading(false)
      return
    }

    // members 테이블에 회원 정보 추가
    if (authData.user) {
      await supabase.from('members').insert({
        id:        authData.user.id,   // Auth uid와 동일하게 맞추면 JOIN이 편함
        name:      form.name,
        email:     form.email,
        phone:     form.phone || null,
        status:    'active',
        join_date: new Date().toISOString(),
        last_login: new Date().toISOString(),
      })
    }

    setLoading(false)
    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-6">✉️</div>
          <h2 className="text-2xl mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}>
            이메일을 확인해주세요
          </h2>
          <p className="text-sm mb-8 leading-relaxed" style={{ color: 'var(--shop-ink2)' }}>
            <strong>{form.email}</strong>으로 인증 메일을 발송했습니다.<br />
            메일의 링크를 클릭하면 가입이 완료됩니다.
          </p>
          <Link
            href="/shop/auth/login"
            className="inline-block px-8 py-3.5 rounded-full text-sm font-semibold"
            style={{ background: 'var(--shop-ink)', color: 'white' }}
          >
            로그인하기
          </Link>
        </div>
      </div>
    )
  }

  const inputStyle = {
    background: 'var(--shop-bg2)', border: '1.5px solid var(--shop-border)',
    color: 'var(--shop-ink)', fontFamily: 'var(--font-body)',
  }
  const focusStyle = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = 'var(--shop-ink)' }
  const blurStyle  = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = 'var(--shop-border)' }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-3xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}>
            회원가입
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--shop-ink3)' }}>회원이 되어 다양한 혜택을 누리세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            { key: 'name',     label: '이름 *',    type: 'text',     placeholder: '홍길동' },
            { key: 'email',    label: '이메일 *',  type: 'email',    placeholder: 'email@example.com' },
            { key: 'phone',    label: '연락처',    type: 'tel',      placeholder: '010-0000-0000' },
            { key: 'password', label: '비밀번호 * (8자 이상)', type: 'password', placeholder: '••••••••' },
            { key: 'confirm',  label: '비밀번호 확인 *', type: 'password', placeholder: '••••••••' },
          ].map(field => (
            <div key={field.key}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--shop-ink2)' }}>
                {field.label}
              </label>
              <input
                type={field.type}
                value={form[field.key as keyof typeof form]}
                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                required={field.label.includes('*')}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={inputStyle}
                onFocus={focusStyle} onBlur={blurStyle}
              />
            </div>
          ))}

          {error && (
            <p className="text-xs text-center py-2 rounded-lg"
              style={{ color: 'var(--shop-accent)', background: 'rgba(196,80,58,0.08)' }}>
              {error}
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'var(--shop-ink)', color: 'white' }}
            >
              {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              가입하기
            </button>
          </div>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: 'var(--shop-ink3)' }}>
          이미 회원이신가요?{' '}
          <Link href="/shop/auth/login" className="font-medium underline" style={{ color: 'var(--shop-ink)' }}>
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}
