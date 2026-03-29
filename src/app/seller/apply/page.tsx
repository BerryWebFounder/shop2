'use client'
// ============================================================
// /app/seller/apply/page.tsx
// 판매자 가입 신청 페이지 (멀티스텝 폼)
// ============================================================

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface FormData {
  // Step 1: 사업자 정보
  business_name: string
  business_type: 'individual' | 'corporation'
  business_number: string
  representative: string
  phone: string
  email: string
  address: string
  // Step 2: 소호몰 정보
  store_name: string
  store_slug: string
  store_category: string
  store_intro: string
}

const CATEGORIES = ['패션/의류', '뷰티/화장품', '식품/건강', '전자/가전', '생활/인테리어', '스포츠/레저', '도서/문구', '반려동물', '유아/아동', '기타']

const STEPS = ['사업자 정보', '소호몰 정보', '약관 동의']

export default function SellerApplyPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [slugChecked, setSlugChecked] = useState<'idle' | 'checking' | 'ok' | 'taken'>('idle')
  const [error, setError] = useState('')
  const [agreed, setAgreed] = useState(false)

  const [form, setForm] = useState<FormData>({
    business_name: '', business_type: 'individual', business_number: '',
    representative: '', phone: '', email: '', address: '',
    store_name: '', store_slug: '', store_category: '', store_intro: '',
  })

  const set = (key: keyof FormData, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const checkSlug = async () => {
    if (!form.store_slug) return
    const slug = form.store_slug.toLowerCase().replace(/[^a-z0-9-]/g, '')
    set('store_slug', slug)
    setSlugChecked('checking')
    const { data } = await supabase.from('seller_applications').select('id').eq('store_slug', slug).single()
    const { data: store } = await supabase.from('seller_stores').select('id').eq('slug', slug).single()
    setSlugChecked(data || store ? 'taken' : 'ok')
  }

  const handleSubmit = async () => {
    if (!agreed) { setError('약관에 동의해 주세요.'); return }
    setLoading(true); setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      const { error: err } = await supabase.from('seller_applications').insert({
        user_id: user.id,
        ...form,
        store_slug: form.store_slug.toLowerCase(),
      })
      if (err) throw err
      router.push('/seller/apply/complete')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* 헤더 */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">소호몰 개설 신청</h1>
          <p className="mt-2 text-gray-500">관리자 승인 후 소호몰을 운영할 수 있습니다</p>
        </div>

        {/* 스텝 인디케이터 */}
        <div className="flex items-center justify-center mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors
                ${i < step ? 'bg-green-500 text-white'
                  : i === step ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-500'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`ml-2 text-sm ${i === step ? 'text-indigo-600 font-medium' : 'text-gray-400'}`}>{s}</span>
              {i < STEPS.length - 1 && <div className="w-12 h-px bg-gray-300 mx-3" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* ===== STEP 0: 사업자 정보 ===== */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-gray-800 mb-6">사업자 정보를 입력해 주세요</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">사업자 유형</label>
                <div className="flex gap-3">
                  {(['individual', 'corporation'] as const).map(t => (
                    <button key={t} onClick={() => set('business_type', t)}
                      className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all
                        ${form.business_type === t ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {t === 'individual' ? '개인사업자' : '법인사업자'}
                    </button>
                  ))}
                </div>
              </div>

              <Field label="상호명 / 업체명 *" value={form.business_name} onChange={v => set('business_name', v)} placeholder="홍길동 스튜디오" />
              {form.business_type === 'corporation' && (
                <Field label="사업자등록번호" value={form.business_number} onChange={v => set('business_number', v)} placeholder="000-00-00000" />
              )}
              <Field label="대표자명 *" value={form.representative} onChange={v => set('representative', v)} placeholder="홍길동" />
              <Field label="연락처 *" value={form.phone} onChange={v => set('phone', v)} placeholder="010-0000-0000" type="tel" />
              <Field label="이메일 *" value={form.email} onChange={v => set('email', v)} placeholder="seller@email.com" type="email" />
              <Field label="사업장 주소 *" value={form.address} onChange={v => set('address', v)} placeholder="서울시 강남구..." />

              <div className="pt-4">
                <button onClick={() => {
                  if (!form.business_name || !form.representative || !form.phone || !form.email || !form.address) {
                    setError('필수 항목을 모두 입력해 주세요.'); return
                  }
                  setError(''); setStep(1)
                }} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
                  다음 단계
                </button>
              </div>
            </div>
          )}

          {/* ===== STEP 1: 소호몰 정보 ===== */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-gray-800 mb-6">소호몰 정보를 설정해 주세요</h2>

              <Field label="상점명 *" value={form.store_name} onChange={v => set('store_name', v)} placeholder="나의 첫 번째 소호몰" />

              {/* Slug 입력 + 중복 체크 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  소호몰 URL *
                  <span className="ml-1 text-xs text-gray-400 font-normal">영문 소문자, 숫자, 하이픈만 사용</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3">
                    <span className="text-gray-400 text-sm">shop.com/stores/</span>
                    <input value={form.store_slug}
                      onChange={e => { set('store_slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSlugChecked('idle') }}
                      className="flex-1 bg-transparent py-2.5 text-sm outline-none" placeholder="my-store" />
                  </div>
                  <button onClick={checkSlug}
                    className="px-4 py-2.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium whitespace-nowrap transition-colors">
                    중복 확인
                  </button>
                </div>
                {slugChecked === 'ok' && <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1"><span>✓</span> 사용 가능한 URL입니다</p>}
                {slugChecked === 'taken' && <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><span>✗</span> 이미 사용 중인 URL입니다</p>}
                {slugChecked === 'checking' && <p className="mt-1.5 text-xs text-gray-400">확인 중...</p>}
              </div>

              {/* 카테고리 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">주요 판매 카테고리 *</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => set('store_category', c)}
                      className={`py-2 px-3 rounded-lg text-xs border transition-all
                        ${form.store_category === c ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">소호몰 소개</label>
                <textarea value={form.store_intro} onChange={e => set('store_intro', e.target.value)}
                  rows={3} placeholder="어떤 상품을 판매하는 소호몰인지 간단히 소개해 주세요"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => { setError(''); setStep(0) }}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                  이전
                </button>
                <button onClick={() => {
                  if (!form.store_name || !form.store_slug || !form.store_category) { setError('필수 항목을 모두 입력해 주세요.'); return }
                  if (slugChecked !== 'ok') { setError('URL 중복 확인을 해주세요.'); return }
                  setError(''); setStep(2)
                }} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
                  다음 단계
                </button>
              </div>
            </div>
          )}

          {/* ===== STEP 2: 약관 동의 ===== */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">신청 내용 확인 및 약관 동의</h2>

              {/* 요약 카드 */}
              <div className="bg-gray-50 rounded-xl p-5 space-y-2 text-sm">
                <SummaryRow label="상호명" value={form.business_name} />
                <SummaryRow label="대표자" value={form.representative} />
                <SummaryRow label="소호몰명" value={form.store_name} />
                <SummaryRow label="URL" value={`shop.com/stores/${form.store_slug}`} />
                <SummaryRow label="카테고리" value={form.store_category} />
                <div className="pt-2 mt-2 border-t border-gray-200">
                  <p className="text-gray-500 text-xs">플랫폼 수수료: 기본 5% (승인 후 관리자가 조정 가능)</p>
                </div>
              </div>

              {/* 약관 */}
              <div className="border border-gray-200 rounded-xl p-4 h-40 overflow-y-auto text-xs text-gray-500 leading-relaxed">
                <p className="font-medium text-gray-700 mb-2">판매자 이용약관 (요약)</p>
                <p>1. 판매자는 플랫폼의 판매 정책을 준수해야 합니다.</p>
                <p>2. 허위 상품 정보 등록 시 소호몰이 정지될 수 있습니다.</p>
                <p>3. 정산은 매월 배송 완료 기준으로 진행됩니다.</p>
                <p>4. 플랫폼은 기본 5%의 수수료를 징수합니다.</p>
                <p>5. 판매자는 주문 접수 후 2영업일 내 발송 처리해야 합니다.</p>
                <p>6. 소비자보호법 및 전자상거래법을 준수해야 합니다.</p>
                <p className="mt-2">이상의 약관에 동의하지 않을 경우 서비스 이용이 제한됩니다.</p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-gray-700">위 약관을 모두 읽었으며 동의합니다</span>
              </label>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setError(''); setStep(1) }}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                  이전
                </button>
                <button onClick={handleSubmit} disabled={loading}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                  {loading ? '제출 중...' : '신청 완료'}
                </button>
              </div>
            </div>
          )}

          {error && step < 2 && <p className="mt-4 text-sm text-red-500">{error}</p>}
        </div>
      </div>
    </div>
  )
}

// ── 서브 컴포넌트 ──
function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  )
}
