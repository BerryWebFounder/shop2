'use client'
// ================================================================
// /seller/apply/[token] — 토큰 검증 후 신청서 작성
// ================================================================
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Step = 'loading' | 'invalid' | 'form' | 'done'
interface StoreCategory { id: string; name: string }

interface FormData {
  // 사업자 정보
  business_name:   string
  business_type:   'individual' | 'corporation'
  business_number: string
  representative:  string
  phone:           string
  address:         string
  // 상점 정보
  store_name:      string
  store_slug:      string
  store_category:  string
  store_intro:     string
}

const EMPTY: FormData = {
  business_name: '', business_type: 'individual', business_number: '',
  representative: '', phone: '', address: '',
  store_name: '', store_slug: '', store_category: '', store_intro: '',
}

export default function SellerApplyTokenPage() {
  const router     = useRouter()
  const { token }  = useParams<{ token: string }>()
  const [step,  setStep]  = useState<Step>('loading')
  const [email, setEmail] = useState('')
  const [storeCategories, setStoreCategories] = useState<StoreCategory[]>([])
  const [error, setError] = useState('')
  const [form,  setForm]  = useState<FormData>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [slugError, setSlugError] = useState('')
  const [currentStep, setCurrentStep] = useState(0) // 0: 사업자, 1: 상점

  // 토큰 검증
  useEffect(() => {
    Promise.all([
      fetch(`/api/seller/apply-token?token=${token}`).then(r => r.json()),
      fetch('/api/store-categories').then(r => r.json()),
    ]).then(([data, catData]) => {
        if (data.valid) {
          setEmail(data.email)
          setStoreCategories(catData.data ?? [])
          setStep('form')
        } else {
          setError(data.error ?? '유효하지 않은 링크입니다.')
          setStep('invalid')
        }
      })
      .catch(() => { setError('오류가 발생했습니다.'); setStep('invalid') })
  }, [token])

  function patch(key: keyof FormData, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleSlug(v: string) {
    const slug = v.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-')
    patch('store_slug', slug)
  }

  function validateSlug() {
    setSlugError('')
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')

    // 로그인 확인 (토큰 링크로 접속했을 때 로그인 안 돼 있을 수 있음)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // 로그인 필요 → 로그인 후 같은 링크로 복귀
      router.push(`/shop/auth/login?redirect=/seller/apply/${token}`)
      return
    }

    // slug 중복 체크
    const slugCheck1 = await fetch('/api/seller/check-slug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: form.store_slug }),
    }).then(r => r.json())

    if (slugCheck1?.exists) {
      setSlugError('이미 사용 중인 URL입니다.')
      setLoading(false)
      return
    }

    // 신청서 제출
    const res = await fetch('/api/seller/apply-submit', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...form, email, token, user_id: user.id }),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? '제출 중 오류가 발생했습니다.')
      setLoading(false)
      return
    }

    setStep('done')
    setLoading(false)
  }

  // ── 로딩 ────────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">링크를 확인하는 중...</p>
        </div>
      </div>
    )
  }

  // ── 유효하지 않은 링크 ───────────────────────────────────────────
  if (step === 'invalid') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-5">⚠️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-3">링크를 사용할 수 없습니다</h1>
          <p className="text-gray-500 text-sm mb-8">{error}</p>
          <a href="/seller/apply"
            className="inline-block px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
            새 링크 요청하기
          </a>
        </div>
      </div>
    )
  }

  // ── 완료 ────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-5">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">신청이 완료되었습니다!</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            관리자 검토 후 승인 결과를<br />
            <strong className="text-gray-700">{email}</strong>으로 안내드립니다.
          </p>
          <a href="/shop" className="text-indigo-600 text-sm hover:underline">쇼핑몰로 이동</a>
        </div>
      </div>
    )
  }

  // ── 신청서 폼 ────────────────────────────────────────────────────
  const inputCls = `w-full px-4 py-3 border border-gray-200 rounded-xl text-sm
    focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors bg-white`
  const labelCls = "block text-sm font-medium text-gray-700 mb-1.5"

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">🏪</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">상점 개설 신청서</h1>
          <p className="text-sm text-gray-500">{email}</p>
        </div>

        {/* 스텝 인디케이터 */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {['사업자 정보', '상점 정보'].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                ${i <= currentStep ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {i + 1}
              </div>
              <span className={`text-xs ${i === currentStep ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`}>
                {label}
              </span>
              {i < 1 && <div className={`w-8 h-px ${i < currentStep ? 'bg-indigo-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 shadow-sm">

          {/* Step 0: 사업자 정보 */}
          {currentStep === 0 && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-gray-800 mb-4">사업자 정보</h2>

              <div>
                <label className={labelCls}>사업자 유형 *</label>
                <div className="flex gap-3">
                  {[['individual','개인사업자'],['corporation','법인사업자']].map(([v, l]) => (
                    <button key={v} type="button"
                      onClick={() => patch('business_type', v)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors
                        ${form.business_type === v
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>상호명 *</label>
                  <input className={inputCls} value={form.business_name}
                    onChange={e => patch('business_name', e.target.value)} placeholder="홍길동 사업체" />
                </div>
                <div>
                  <label className={labelCls}>대표자명 *</label>
                  <input className={inputCls} value={form.representative}
                    onChange={e => patch('representative', e.target.value)} placeholder="홍길동" />
                </div>
                <div>
                  <label className={labelCls}>사업자등록번호</label>
                  <input className={inputCls} value={form.business_number}
                    onChange={e => patch('business_number', e.target.value)} placeholder="000-00-00000" />
                </div>
                <div>
                  <label className={labelCls}>연락처 *</label>
                  <input className={inputCls} value={form.phone}
                    onChange={e => patch('phone', e.target.value)} placeholder="010-0000-0000" />
                </div>
              </div>
              <div>
                <label className={labelCls}>사업장 주소 *</label>
                <input className={inputCls} value={form.address}
                  onChange={e => patch('address', e.target.value)} placeholder="서울특별시 강남구 ..." />
              </div>

              <button
                onClick={() => {
                  if (!form.business_name || !form.representative || !form.phone || !form.address) {
                    setError('필수 항목을 모두 입력해 주세요.'); return
                  }
                  setError(''); setCurrentStep(1)
                }}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors mt-2">
                다음 →
              </button>
            </div>
          )}

          {/* Step 1: 상점 정보 */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-gray-800 mb-4">상점 정보</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>상점 이름 *</label>
                  <input className={inputCls} value={form.store_name}
                    onChange={e => { patch('store_name', e.target.value); if (!form.store_slug) handleSlug(e.target.value) }} placeholder="나의 쇼핑몰" />
                </div>
                <div>
                  <label className={labelCls}>URL 주소 *</label>
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400">
                    <span className="px-3 py-3 bg-gray-50 text-xs text-gray-400 whitespace-nowrap border-r border-gray-200">/stores/</span>
                    <input className="flex-1 px-3 py-3 text-sm outline-none bg-white"
                      value={form.store_slug} onChange={e => handleSlug(e.target.value)} placeholder="my-store" />
                  </div>
                  {slugError && <p className="text-xs text-red-500 mt-1">{slugError}</p>}
                </div>
              </div>

              <div>
                <label className={labelCls}>카테고리 *</label>
                <select className={inputCls} value={form.store_category}
                  onChange={e => patch('store_category', e.target.value)}>
                  <option value="">카테고리 선택</option>
                  {storeCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>상점 소개 <span className="text-gray-400 font-normal">(선택)</span></label>
                <textarea className={inputCls + ' resize-none'} rows={3}
                  value={form.store_intro} onChange={e => patch('store_intro', e.target.value)}
                  placeholder="상점을 간단히 소개해 주세요" />
              </div>

              {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-2.5">{error}</p>}

              <div className="flex gap-3 mt-2">
                <button onClick={() => { setError(''); setCurrentStep(0) }}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                  ← 이전
                </button>
                <button onClick={handleSubmit} disabled={loading}
                  className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {loading ? '제출 중...' : '신청서 제출'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          이 링크는 <strong>{email}</strong>에게 발송된 1회용 전용 링크입니다.
        </p>
      </div>
    </div>
  )
}
