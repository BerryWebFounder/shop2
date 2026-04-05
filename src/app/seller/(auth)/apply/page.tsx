'use client'
// ================================================================
// /seller/apply — 이메일 입력 후 신청 링크 발송
// ================================================================
import { useState } from 'react'
import Link from 'next/link'

export default function SellerApplyRequestPage() {
  const [email,    setEmail]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [sent,     setSent]     = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res  = await fetch('/api/seller/apply-invite', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email }),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? '오류가 발생했습니다.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-5">📬</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">메일을 확인해 주세요</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-2">
            <strong className="text-gray-700">{email}</strong>으로<br />
            신청 링크를 발송했습니다.
          </p>
          <p className="text-gray-400 text-xs mb-8">
            링크는 <strong>48시간</strong> 동안 유효하며 1회만 사용할 수 있습니다.<br />
            메일이 없다면 스팸함을 확인해 주세요.
          </p>
          <button
            onClick={() => { setSent(false); setEmail('') }}
            className="text-indigo-600 text-sm hover:underline"
          >
            다른 이메일로 다시 받기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
            🏪
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">상점 개설 신청</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            이메일 주소를 입력하시면 신청서 작성 링크를<br />
            메일로 보내드립니다.
          </p>
        </div>

        {/* 폼 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                이메일 주소
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                autoFocus
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400
                  transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-2.5">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold
                rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {loading ? '발송 중...' : '신청 링크 받기'}
            </button>
          </form>

          {/* 안내 */}
          <div className="mt-6 pt-5 border-t border-gray-50 space-y-2">
            {[
              '📨  입력한 이메일로 신청서 링크가 전송됩니다',
              '⏱️  링크는 48시간 동안 유효합니다',
              '🔒  링크는 1회만 사용할 수 있습니다',
            ].map(t => (
              <p key={t} className="text-xs text-gray-400">{t}</p>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          이미 판매자 계정이 있으신가요?{' '}
          <Link href="/shop/auth/login" className="text-indigo-600 hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}
