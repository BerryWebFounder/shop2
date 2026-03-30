'use client'
// ================================================================
// src/app/login/page.tsx
// 로그인 성공 후 profiles.role을 직접 조회해서 역할별 분기
// ================================================================
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()

    // 1. 로그인
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password })

    if (authError || !authData.user) {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.')
      setLoading(false)
      return
    }

    // 2. profiles에서 role 직접 조회
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    const role = profile?.role ?? 'customer'

    // 3. ?next 파라미터 우선, 없으면 role에 따라 분기
    const next = searchParams.get('next')
    if (next && next.startsWith('/')) {
      router.push(next)
    } else if (role === 'admin') {
      router.push('/admin/dashboard')
    } else if (role === 'seller') {
      router.push('/seller')
    } else {
      router.push('/shop')
    }

    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-ink-2 mb-1.5">이메일</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="admin@shop.com"
          required
          autoFocus
          className="w-full bg-bg-3 border border-border rounded-lg px-3.5 py-2.5 text-sm text-ink placeholder-[var(--text-3)]
            focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-2 mb-1.5">비밀번호</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          className="w-full bg-bg-3 border border-border rounded-lg px-3.5 py-2.5 text-sm text-ink placeholder-[var(--text-3)]
            focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
        />
      </div>

      {error && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full mt-2 bg-accent hover:bg-accent-2 active:scale-[0.98] text-white font-semibold
          rounded-lg py-2.5 text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed
          flex items-center justify-center gap-2"
      >
        {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        {loading ? '로그인 중...' : '로그인'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center"
      style={{ backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(79,142,247,0.1) 0%, transparent 70%)' }}
    >
      <div className="w-[380px] bg-bg-2 border border-border-2 rounded-2xl shadow-2xl p-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center text-xl">🛍️</div>
            <span className="text-xl font-bold tracking-tight text-ink">ShopAdmin</span>
          </div>
          <p className="text-xs text-ink-3 tracking-wider mt-1">쇼핑몰 관리 시스템</p>
        </div>

        <Suspense fallback={
          <div className="flex justify-center py-8">
            <span className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <LoginForm />
        </Suspense>

        <p className="text-center text-[11px] text-ink-3 mt-6">
          Powered by Vercel + Supabase
        </p>
      </div>
    </div>
  )
}
