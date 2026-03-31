'use client'
// ================================================================
// src/app/seller/apply/page.tsx
// 판매자 가입 신청 — 3단계 멀티스텝 폼
// ================================================================

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { STORE_CATEGORIES } from '@/lib/types/v2'

// ── 타입 ──────────────────────────────────────────────────────────
type BusinessType = 'individual' | 'corporation'
type SlugState    = 'idle' | 'checking' | 'ok' | 'taken'

interface ApplyForm {
  business_name:   string
  business_type:   BusinessType
  business_number: string
  representative:  string
  phone:           string
  email:           string
  address:         string
  store_name:      string
  store_slug:      string
  store_category:  string
  store_intro:     string
}

const INITIAL_FORM: ApplyForm = {
  business_name: '', business_type: 'individual', business_number: '',
  representative: '', phone: '', email: '', address: '',
  store_name: '', store_slug: '', store_category: '', store_intro: '',
}

const STEPS = ['사업자 정보', '소호몰 정보', '약관 동의'] as const

// ── 유효성 검사 ───────────────────────────────────────────────────
function validateStep0(form: ApplyForm): string {
  if (!form.business_name) return '상호명을 입력해 주세요.'
  if (!form.representative) return '대표자명을 입력해 주세요.'
  if (!form.phone) return '연락처를 입력해 주세요.'
  if (!form.email) return '이메일을 입력해 주세요.'
  if (!form.address) return '주소를 입력해 주세요.'
  return ''
}

function validateStep1(form: ApplyForm, slugState: SlugState): string {
  if (!form.store_name)     return '상점명을 입력해 주세요.'
  if (!form.store_slug)     return 'URL을 입력해 주세요.'
  if (slugState !== 'ok')   return 'URL 중복 확인을 해주세요.'
  if (!form.store_category) return '카테고리를 선택해 주세요.'
  return ''
}

// ── 컴포넌트 ─────────────────────────────────────────────────────
export default function SellerApplyPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [step, setStep]           = useState(0)
  const [form, setForm]           = useState<ApplyForm>(INITIAL_FORM)
  const [slugState, setSlugState] = useState<SlugState>('idle')
  const [agreed, setAgreed]       = useState(false)
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  const patch = (key: keyof ApplyForm, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const goNext = (validateFn: () => string) => {
    const err = validateFn()
    if (err) { setError(err); return }
    setError('')
    setStep(s => s + 1)
  }

  const goBack = () => { setError(''); setStep(s => s - 1) }

  // slug 중복 확인
  const checkSlug = async () => {
    if (!form.store_slug) return
    const slug = form.store_slug.toLowerCase().replace(/[^a-z0-9-]/g, '')
    patch('store_slug', slug)
    setSlugState('checking')

    const [{ data: app }, { data: store }] = await Promise.all([
      supabase.from('seller_applications').select('id').eq('store_slug', slug).maybeSingle(),
      supabase.from('seller_stores').select('id').eq('slug', slug).maybeSingle(),
    ])
    setSlugState(app || store ? 'taken' : 'ok')
  }

  const handleSubmit = async () => {
    if (!agreed) { setError('약관에 동의해 주세요.'); return }
    setLoading(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      const { error: dbErr } = await supabase
        .from('seller_applications')
        .insert({ user_id: user.id, ...form, store_slug: form.store_slug.toLowerCase() })
      if (dbErr) throw dbErr

      // profiles.seller_status를 pending으로 표시 (미들웨어 접근 제어에 사용)
      await supabase
        .from('profiles')
        .update({ seller_status: 'pending' })
        .eq('id', user.id)

      router.push('/seller/apply/complete')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* 헤더 */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">소호몰 개설 신청</h1>
          <p className="mt-2 text-gray-500">관리자 승인 후 소호몰을 운영할 수 있습니다</p>
        </div>

        {/* 스텝 인디케이터 */}
        <StepIndicator current={step} steps={STEPS} />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {step === 0 && (
            <Step0
              form={form} patch={patch}
              onNext={() => goNext(() => validateStep0(form))}
            />
          )}
          {step === 1 && (
            <Step1
              form={form} patch={patch}
              slugState={slugState} setSlugState={setSlugState}
              onCheckSlug={checkSlug}
              onNext={() => goNext(() => validateStep1(form, slugState))}
              onBack={goBack}
            />
          )}
          {step === 2 && (
            <Step2
              form={form} agreed={agreed}
              onToggleAgreed={() => setAgreed(a => !a)}
              onSubmit={handleSubmit}
              onBack={goBack}
              loading={loading}
            />
          )}

          {error && (
            <p className="mt-4 text-sm text-red-500">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 서브 컴포넌트: StepIndicator ─────────────────────────────────
function StepIndicator({ current, steps }: {
  current: number
  steps: readonly string[]
}) {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className={`
            flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors
            ${i < current  ? 'bg-green-500 text-white'
              : i === current ? 'bg-indigo-600 text-white'
              : 'bg-gray-200 text-gray-500'}
          `}>
            {i < current ? '✓' : i + 1}
          </div>
          <span className={`ml-2 text-sm ${i === current ? 'text-indigo-600 font-medium' : 'text-gray-400'}`}>
            {label}
          </span>
          {i < steps.length - 1 && <div className="w-12 h-px bg-gray-300 mx-3" />}
        </div>
      ))}
    </div>
  )
}

// ── 서브 컴포넌트: Step0 — 사업자 정보 ───────────────────────────
function Step0({ form, patch, onNext }: {
  form: ApplyForm
  patch: (k: keyof ApplyForm, v: string) => void
  onNext: () => void
}) {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-800 mb-6">사업자 정보를 입력해 주세요</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">사업자 유형</label>
        <div className="flex gap-3">
          {(['individual', 'corporation'] as const).map(t => (
            <button key={t} type="button" onClick={() => patch('business_type', t)}
              className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all
                ${form.business_type === t
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              {t === 'individual' ? '개인사업자' : '법인사업자'}
            </button>
          ))}
        </div>
      </div>

      <Field label="상호명 / 업체명 *" value={form.business_name}
        onChange={v => patch('business_name', v)} placeholder="홍길동 스튜디오" />
      {form.business_type === 'corporation' && (
        <Field label="사업자등록번호" value={form.business_number}
          onChange={v => patch('business_number', v)} placeholder="000-00-00000" />
      )}
      <Field label="대표자명 *" value={form.representative}
        onChange={v => patch('representative', v)} placeholder="홍길동" />
      <Field label="연락처 *" value={form.phone} type="tel"
        onChange={v => patch('phone', v)} placeholder="010-0000-0000" />
      <Field label="이메일 *" value={form.email} type="email"
        onChange={v => patch('email', v)} placeholder="seller@email.com" />
      <Field label="사업장 주소 *" value={form.address}
        onChange={v => patch('address', v)} placeholder="서울시 강남구..." />

      <div className="pt-4">
        <BtnPrimary onClick={onNext}>다음 단계</BtnPrimary>
      </div>
    </div>
  )
}

// ── 서브 컴포넌트: Step1 — 소호몰 정보 ───────────────────────────
function Step1({ form, patch, slugState, setSlugState, onCheckSlug, onNext, onBack }: {
  form: ApplyForm
  patch: (k: keyof ApplyForm, v: string) => void
  slugState: SlugState
  setSlugState: (s: SlugState) => void
  onCheckSlug: () => void
  onNext: () => void
  onBack: () => void
}) {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-800 mb-6">소호몰 정보를 설정해 주세요</h2>

      <Field label="상점명 *" value={form.store_name}
        onChange={v => patch('store_name', v)} placeholder="나의 첫 번째 소호몰" />

      {/* Slug */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          소호몰 URL *
          <span className="ml-1 text-xs text-gray-400 font-normal">영문 소문자, 숫자, 하이픈만</span>
        </label>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3">
            <span className="text-gray-400 text-sm shrink-0">shop.com/stores/</span>
            <input
              value={form.store_slug}
              onChange={e => {
                patch('store_slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                setSlugState('idle')
              }}
              className="flex-1 bg-transparent py-2.5 text-sm outline-none"
              placeholder="my-store"
            />
          </div>
          <button type="button" onClick={onCheckSlug}
            className="px-4 py-2.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium whitespace-nowrap transition-colors">
            중복 확인
          </button>
        </div>
        {slugState === 'ok'       && <p className="mt-1.5 text-xs text-green-600">✓ 사용 가능한 URL입니다</p>}
        {slugState === 'taken'    && <p className="mt-1.5 text-xs text-red-500">✗ 이미 사용 중인 URL입니다</p>}
        {slugState === 'checking' && <p className="mt-1.5 text-xs text-gray-400">확인 중...</p>}
      </div>

      {/* 카테고리 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">주요 판매 카테고리 *</label>
        <div className="grid grid-cols-3 gap-2">
          {STORE_CATEGORIES.map(c => (
            <button key={c} type="button" onClick={() => patch('store_category', c)}
              className={`py-2 px-3 rounded-lg text-xs border transition-all
                ${form.store_category === c
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">소호몰 소개</label>
        <textarea
          value={form.store_intro} rows={3}
          onChange={e => patch('store_intro', e.target.value)}
          placeholder="어떤 상품을 판매하는 소호몰인지 간단히 소개해 주세요"
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <BtnSecondary onClick={onBack}>이전</BtnSecondary>
        <BtnPrimary onClick={onNext}>다음 단계</BtnPrimary>
      </div>
    </div>
  )
}

// ── 서브 컴포넌트: Step2 — 약관 동의 ────────────────────────────
function Step2({ form, agreed, onToggleAgreed, onSubmit, onBack, loading }: {
  form: ApplyForm; agreed: boolean
  onToggleAgreed: () => void; onSubmit: () => void
  onBack: () => void; loading: boolean
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">신청 내용 확인 및 약관 동의</h2>

      {/* 요약 */}
      <div className="bg-gray-50 rounded-xl p-5 space-y-2 text-sm">
        {([
          ['상호명',    form.business_name],
          ['대표자',    form.representative],
          ['소호몰명',  form.store_name],
          ['URL',      `shop.com/stores/${form.store_slug}`],
          ['카테고리', form.store_category],
        ] as const).map(([label, value]) => (
          <div key={label} className="flex justify-between">
            <span className="text-gray-500">{label}</span>
            <span className="text-gray-800 font-medium">{value}</span>
          </div>
        ))}
        <p className="pt-2 mt-2 border-t border-gray-200 text-xs text-gray-500">
          플랫폼 수수료: 기본 5% (승인 후 관리자가 조정 가능)
        </p>
      </div>

      {/* 약관 */}
      <div className="border border-gray-200 rounded-xl p-4 h-40 overflow-y-auto text-xs text-gray-500 leading-relaxed space-y-1">
        <p className="font-medium text-gray-700 mb-2">판매자 이용약관 (요약)</p>
        <p>1. 판매자는 플랫폼의 판매 정책을 준수해야 합니다.</p>
        <p>2. 허위 상품 정보 등록 시 소호몰이 정지될 수 있습니다.</p>
        <p>3. 정산은 매월 배송 완료 기준으로 진행됩니다.</p>
        <p>4. 플랫폼은 기본 5%의 수수료를 징수합니다.</p>
        <p>5. 판매자는 주문 접수 후 2영업일 내 발송 처리해야 합니다.</p>
        <p>6. 소비자보호법 및 전자상거래법을 준수해야 합니다.</p>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={agreed} onChange={onToggleAgreed}
          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
        <span className="text-sm text-gray-700">위 약관을 모두 읽었으며 동의합니다</span>
      </label>

      <div className="flex gap-3 pt-2">
        <BtnSecondary onClick={onBack}>이전</BtnSecondary>
        <BtnPrimary onClick={onSubmit} disabled={loading}>
          {loading ? '제출 중...' : '신청 완료'}
        </BtnPrimary>
      </div>
    </div>
  )
}

// ── 공용 UI 서브 컴포넌트 ────────────────────────────────────────
function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string
  onChange: (v: string) => void
  placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
      />
    </div>
  )
}

function BtnPrimary({ onClick, disabled, children }: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium
        hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
      {children}
    </button>
  )
}

function BtnSecondary({ onClick, children }: {
  onClick: () => void; children: React.ReactNode
}) {
  return (
    <button type="button" onClick={onClick}
      className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium
        hover:bg-gray-50 transition-colors">
      {children}
    </button>
  )
}
