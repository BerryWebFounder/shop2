'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function ShopLoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirect     = searchParams.get('redirect') ?? '/shop'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      setLoading(false)
      return
    }
    router.push(redirect)
    router.refresh()
  }

  const inputStyle = {
    background: 'var(--shop-bg2)', border: '1.5px solid var(--shop-border)',
    color: 'var(--shop-ink)', fontFamily: 'var(--font-body)',
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--shop-ink2)' }}>이메일</label>
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="email@example.com" required autoFocus
          className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
          style={inputStyle}
          onFocus={e => { e.target.style.borderColor = 'var(--shop-ink)' }}
          onBlur={e  => { e.target.style.borderColor = 'var(--shop-border)' }}
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--shop-ink2)' }}>비밀번호</label>
        <input
          type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="••••••••" required
          className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
          style={inputStyle}
          onFocus={e => { e.target.style.borderColor = 'var(--shop-ink)' }}
          onBlur={e  => { e.target.style.borderColor = 'var(--shop-border)' }}
        />
      </div>

      {error && (
        <p className="text-xs text-center py-2 rounded-lg"
          style={{ color: 'var(--shop-accent)', background: 'rgba(196,80,58,0.08)' }}>
          {error}
        </p>
      )}

      <button
        type="submit" disabled={loading}
        className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ background: 'var(--shop-ink)', color: 'white' }}
      >
        {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        로그인
      </button>
    </form>
  )
}

export default function ShopLoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16"
      style={{ background: 'var(--shop-bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Link href="/shop">
            <h1 className="text-3xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}>
              로그인
            </h1>
          </Link>
          <p className="text-sm mt-2" style={{ color: 'var(--shop-ink3)' }}>쇼핑몰 회원 로그인</p>
        </div>

        <Suspense fallback={
          <div className="flex justify-center py-8">
            <span className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--shop-ink)' }} />
          </div>
        }>
          <ShopLoginForm />
        </Suspense>

        <div className="text-center mt-6 space-y-3">
          <p className="text-sm" style={{ color: 'var(--shop-ink3)' }}>
            아직 회원이 아니신가요?{' '}
            <Link href="/shop/auth/register" className="font-medium underline" style={{ color: 'var(--shop-ink)' }}>
              회원가입
            </Link>
          </p>
          <Link href="/shop" className="text-xs block" style={{ color: 'var(--shop-ink3)' }}>
            쇼핑몰로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}
