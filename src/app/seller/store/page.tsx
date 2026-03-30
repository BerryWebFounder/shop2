'use client'
// ================================================================
// src/app/seller/store/page.tsx
// 판매자 소호몰 설정 페이지
// ================================================================

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SellerStore, StoreUpdateData } from '@/lib/types/v2'

const PRESET_COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6'] as const

export default function SellerStorePage() {
  const supabase = createClient()
  const [store,   setStore]   = useState<SellerStore | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [form,    setForm]    = useState<StoreUpdateData>({})
  const logoRef   = useRef<HTMLInputElement>(null)
  const bannerRef = useRef<HTMLInputElement>(null)

  // 초기 데이터 로드
  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('seller_stores').select('*').eq('owner_id', user.id).single()
      if (data) {
        setStore(data)
        const { store_name, tagline, intro, theme_color,
                contact_email, contact_phone, shipping_policy, return_policy } = data
        setForm({ store_name, tagline, intro, theme_color,
                  contact_email, contact_phone, shipping_policy, return_policy })
      }
      setLoading(false)
    })()
  }, [])

  // 이미지 업로드 (로고 / 배너 공용)
  const uploadImage = async (file: File, folder: 'logos' | 'banners') => {
    const { data: { user } } = await supabase.auth.getUser()
    const ext  = file.name.split('.').pop()
    const path = `stores/${user?.id}/${folder}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('store-assets').upload(path, file, { upsert: true })
    if (error) throw error
    return supabase.storage.from('store-assets').getPublicUrl(path).data.publicUrl
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_url' | 'banner_url') => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const url = await uploadImage(file, field === 'logo_url' ? 'logos' : 'banners')
      patchForm(field, url)
    } catch {
      alert('이미지 업로드에 실패했습니다.')
    }
  }

  const handleSave = async () => {
    if (!store) return
    setSaving(true)
    const { error } = await supabase
      .from('seller_stores')
      .update({ ...form, updated_at: new Date().toISOString() })
      .eq('id', store.id)
    if (error) {
      alert('저장 실패: ' + error.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  // StoreUpdateData 타입이 좁아서 안전하게 patch
  const patchForm = <K extends keyof StoreUpdateData>(key: K, value: StoreUpdateData[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  if (loading) return <LoadingScreen text="불러오는 중..." />
  if (!store)  return <LoadingScreen text="소호몰 정보를 찾을 수 없습니다." />

  const logoUrl   = form.logo_url   ?? store.logo_url
  const bannerUrl = form.banner_url ?? store.banner_url
  const themeColor = form.theme_color ?? store.theme_color

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">소호몰 설정</h1>
          <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
              운영 중
            </span>
            <a href={`/stores/${store.slug}`} target="_blank" rel="noreferrer"
              className="text-indigo-600 hover:underline text-xs">
              shop.com/stores/{store.slug}
            </a>
          </p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-60
            ${saved ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
          {saving ? '저장 중...' : saved ? '✓ 저장됨' : '변경사항 저장'}
        </button>
      </div>

      {/* 배너 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">소호몰 배너</label>
        <div onClick={() => bannerRef.current?.click()}
          className="relative h-40 bg-gray-100 rounded-xl overflow-hidden cursor-pointer group
            hover:opacity-90 transition-opacity border-2 border-dashed border-gray-200">
          {bannerUrl
            ? <img src={bannerUrl} alt="banner" className="w-full h-full object-cover" />
            : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <span className="text-2xl mb-1">🖼️</span>
                <p className="text-sm">배너 이미지 업로드</p>
                <p className="text-xs mt-0.5">권장 1200×400px</p>
              </div>
            )
          }
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity
            flex items-center justify-center">
            <span className="text-white text-sm font-medium">이미지 변경</span>
          </div>
        </div>
        <input ref={bannerRef} type="file" accept="image/*" className="hidden"
          onChange={e => handleImageChange(e, 'banner_url')} />
      </div>

      {/* 기본 정보 */}
      <Section title="기본 정보">
        <div className="flex gap-6">
          {/* 로고 */}
          <div className="shrink-0">
            <div onClick={() => logoRef.current?.click()}
              className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden cursor-pointer
                hover:opacity-80 transition-opacity border-2 border-dashed border-gray-200
                flex items-center justify-center">
              {logoUrl
                ? <img src={logoUrl} alt="logo" className="w-full h-full object-cover" />
                : <span className="text-2xl">🏪</span>
              }
            </div>
            <p className="text-xs text-gray-400 text-center mt-1">로고</p>
            <input ref={logoRef} type="file" accept="image/*" className="hidden"
              onChange={e => handleImageChange(e, 'logo_url')} />
          </div>

          <div className="flex-1 space-y-4">
            <FormField label="상점명 *" value={form.store_name ?? ''}
              onChange={v => patchForm('store_name', v)} placeholder="나의 소호몰" />
            <FormField label="한 줄 소개" value={form.tagline ?? ''}
              onChange={v => patchForm('tagline', v)} placeholder="특별한 물건들을 파는 곳" />
          </div>
        </div>
      </Section>

      {/* 상세 소개 */}
      <Section title="상세 소개">
        <textarea
          value={form.intro ?? ''} rows={5}
          onChange={e => patchForm('intro', e.target.value)}
          placeholder="소호몰을 소개하는 문구를 작성해 주세요. 고객들이 첫 화면에서 보게 됩니다."
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none
            focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
        />
      </Section>

      {/* 테마 & 연락처 */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <Section title="테마 색상" noMargin>
          <div className="flex items-center gap-3">
            <input type="color" value={themeColor}
              onChange={e => patchForm('theme_color', e.target.value)}
              className="w-12 h-12 rounded-lg border-0 cursor-pointer" />
            <div>
              <p className="text-sm font-medium text-gray-800">{themeColor}</p>
              <p className="text-xs text-gray-400">버튼, 강조 색상에 사용됩니다</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            {PRESET_COLORS.map(c => (
              <button key={c} type="button" onClick={() => patchForm('theme_color', c)}
                style={{ backgroundColor: c }}
                className={`w-7 h-7 rounded-full transition-transform hover:scale-110
                  ${themeColor === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
              />
            ))}
          </div>
        </Section>

        <Section title="연락처" noMargin>
          <div className="space-y-3">
            <FormField label="이메일" value={form.contact_email ?? ''} type="email"
              onChange={v => patchForm('contact_email', v)} placeholder="contact@mystore.com" />
            <FormField label="전화" value={form.contact_phone ?? ''} type="tel"
              onChange={v => patchForm('contact_phone', v)} placeholder="010-0000-0000" />
          </div>
        </Section>
      </div>

      {/* 정책 */}
      <Section title="배송 및 반품 정책">
        <div className="space-y-4">
          <TextareaField
            label="배송 정책"
            value={form.shipping_policy ?? ''}
            onChange={v => patchForm('shipping_policy', v)}
            placeholder="예) 주문 후 1-3 영업일 이내 발송 / 기본 배송비 3,000원 / 30,000원 이상 무료배송"
          />
          <TextareaField
            label="반품/교환 정책"
            value={form.return_policy ?? ''}
            onChange={v => patchForm('return_policy', v)}
            placeholder="예) 수령 후 7일 이내 반품 가능 / 단순 변심 반품비 편도 3,000원"
          />
        </div>
      </Section>

      {/* 수수료 (읽기 전용) */}
      <div className="mt-4 p-4 bg-gray-50 rounded-xl flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">플랫폼 수수료율</p>
          <p className="text-xs text-gray-400 mt-0.5">
            매출의 {store.fee_rate}%가 수수료로 차감됩니다
          </p>
        </div>
        <span className="text-2xl font-bold text-indigo-600">{store.fee_rate}%</span>
      </div>
    </div>
  )
}

// ── UI 헬퍼 ──────────────────────────────────────────────────────
function LoadingScreen({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-screen text-gray-400 text-sm">
      {text}
    </div>
  )
}

function Section({ title, children, noMargin }: {
  title: string; children: React.ReactNode; noMargin?: boolean
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 p-6 ${noMargin ? '' : 'mb-6'}`}>
      <h2 className="text-base font-semibold text-gray-800 mb-5">{title}</h2>
      {children}
    </div>
  )
}

function FormField({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string
  onChange: (v: string) => void
  placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
      />
    </div>
  )
}

function TextareaField({ label, value, onChange, placeholder }: {
  label: string; value: string
  onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <textarea value={value} rows={3} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none
          focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
      />
    </div>
  )
}
