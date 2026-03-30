'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  INQUIRY_CATEGORY_LABEL,
  type InquiryCategory, type FAQ,
} from '@/types/cs'

const CATEGORIES = Object.entries(INQUIRY_CATEGORY_LABEL) as [InquiryCategory, string][]

export default function SupportPage() {
  const router = useRouter()
  const [tab, setTab]               = useState<'inquiry' | 'faq'>('inquiry')
  const [faqs, setFaqs]             = useState<FAQ[]>([])
  const [faqCat, setFaqCat]         = useState<InquiryCategory | ''>('')
  const [openFaq, setOpenFaq]       = useState<string | null>(null)
  const [loading, setLoading]       = useState(false)
  const [success, setSuccess]       = useState(false)
  const [error, setError]           = useState('')
  const [files, setFiles]           = useState<File[]>([])
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])
  const [uploading, setUploading]   = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    category:     'other' as InquiryCategory,
    title:        '',
    body:         '',
    order_id:     '',
    author_name:  '',
    author_email: '',
  })

  // 로그인 정보 자동 입력
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setForm(f => ({ ...f, author_email: user.email ?? '' }))
        supabase.from('members').select('name').eq('email', user.email ?? '').single()
          .then(({ data }) => {
            if (data?.name) setForm(f => ({ ...f, author_name: data.name }))
          })
      }
    })
  }, [])

  // FAQ 조회
  useEffect(() => {
    if (tab !== 'faq') return
    const p = faqCat ? `?category=${faqCat}` : ''
    fetch(`/api/faqs${p}`).then(r => r.json()).then(j => setFaqs(j.data ?? []))
  }, [tab, faqCat])

  // 파일 업로드
  async function uploadFiles(fileList: File[]) {
    if (fileList.length === 0) return
    setUploading(true)
    const urls: string[] = []
    for (const file of fileList) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('inquiryId', 'temp')
      const res  = await fetch('/api/upload/inquiry', { method: 'POST', body: fd })
      const json = await res.json()
      if (res.ok && json.signedUrl) urls.push(json.signedUrl)
    }
    setUploadedUrls(prev => [...prev, ...urls])
    setUploading(false)
  }

  // 문의 제출
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.body.trim()) { setError('제목과 내용을 입력하세요'); return }
    if (!form.author_name.trim())  { setError('이름을 입력하세요'); return }
    if (!form.author_email.trim()) { setError('이메일을 입력하세요'); return }
    setLoading(true); setError('')

    const res  = await fetch('/api/inquiries', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        ...form,
        order_id:    form.order_id || null,
        attachments: uploadedUrls,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? '등록 실패'); setLoading(false); return }
    setSuccess(true); setLoading(false)
  }

  const inputStyle = {
    width: '100%', background: 'var(--shop-bg2)', border: '1.5px solid var(--shop-border)',
    borderRadius: 12, padding: '10px 14px', outline: 'none',
    color: 'var(--shop-ink)', fontFamily: 'var(--font-body)', fontSize: 14,
    transition: 'border-color 0.2s',
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }} className="px-4 sm:px-6 md:px-8 py-8 md:py-10">
      {/* 헤더 */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}>
          고객센터
        </h1>
        <p className="text-sm" style={{ color: 'var(--shop-ink3)' }}>
          무엇이든 편하게 문의해 주세요. 빠른 시간 내에 답변 드리겠습니다.
        </p>
        <div className="flex items-center justify-center gap-3 mt-4 text-xs" style={{ color: 'var(--shop-ink3)' }}>
          <span>📞 평일 09:00–18:00</span>
          <span>·</span>
          <span>📧 1–2 영업일 내 답변</span>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex border-b mb-8" style={{ borderColor: 'var(--shop-border)' }}>
        {[
          { key: 'inquiry', label: '1:1 문의' },
          { key: 'faq',     label: 'FAQ' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className="px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px"
            style={{
              borderColor: tab === t.key ? 'var(--shop-ink)' : 'transparent',
              color:       tab === t.key ? 'var(--shop-ink)' : 'var(--shop-ink3)',
            }}
          >
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        {tab === 'inquiry' && (
          <Link href="/shop/support/inquiries"
            className="self-center text-xs px-4 py-2 rounded-full transition-all"
            style={{ border: '1px solid var(--shop-border)', color: 'var(--shop-ink2)' }}>
            내 문의 내역
          </Link>
        )}
      </div>

      {/* ── 문의 탭 ── */}
      {tab === 'inquiry' && (
        success ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">✅</p>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--shop-ink)' }}>
              문의가 접수되었습니다
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--shop-ink3)' }}>
              1–2 영업일 내에 이메일({form.author_email})로 답변 드리겠습니다.
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/shop/support/inquiries"
                className="px-6 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: 'var(--shop-ink)', color: 'white' }}>
                문의 내역 보기
              </Link>
              <button onClick={() => { setSuccess(false); setForm(f => ({ ...f, title: '', body: '' })); setUploadedUrls([]) }}
                className="px-6 py-2.5 rounded-full text-sm"
                style={{ border: '1px solid var(--shop-border)', color: 'var(--shop-ink)' }}>
                추가 문의
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 카테고리 */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--shop-ink2)' }}>문의 유형 *</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(([key, label]) => (
                  <button key={key} type="button"
                    onClick={() => setForm(f => ({ ...f, category: key }))}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      background:  form.category === key ? 'var(--shop-ink)' : 'var(--shop-bg2)',
                      color:       form.category === key ? 'white' : 'var(--shop-ink2)',
                      border:      form.category === key ? 'none' : '1px solid var(--shop-border)',
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 이름 / 이메일 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--shop-ink2)' }}>이름 *</label>
                <input type="text" value={form.author_name}
                  onChange={e => setForm(f => ({ ...f, author_name: e.target.value }))}
                  placeholder="홍길동" required style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--shop-ink)' }}
                  onBlur={e =>  { e.target.style.borderColor = 'var(--shop-border)' }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--shop-ink2)' }}>이메일 *</label>
                <input type="email" value={form.author_email}
                  onChange={e => setForm(f => ({ ...f, author_email: e.target.value }))}
                  placeholder="email@example.com" required style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--shop-ink)' }}
                  onBlur={e =>  { e.target.style.borderColor = 'var(--shop-border)' }} />
              </div>
            </div>

            {/* 주문번호 (선택) */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--shop-ink2)' }}>
                주문번호 <span style={{ color: 'var(--shop-ink3)' }}>(관련 주문이 있는 경우)</span>
              </label>
              <input type="text" value={form.order_id}
                onChange={e => setForm(f => ({ ...f, order_id: e.target.value }))}
                placeholder="ORD-20240321-00001" style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--shop-ink)' }}
                onBlur={e =>  { e.target.style.borderColor = 'var(--shop-border)' }} />
            </div>

            {/* 제목 */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--shop-ink2)' }}>제목 *</label>
              <input type="text" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="문의 제목을 입력하세요" required style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--shop-ink)' }}
                onBlur={e =>  { e.target.style.borderColor = 'var(--shop-border)' }} />
            </div>

            {/* 내용 */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--shop-ink2)' }}>
                문의 내용 * <span style={{ color: 'var(--shop-ink3)' }}>{form.body.length}/5000</span>
              </label>
              <textarea value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder="문의 내용을 자세히 작성해 주세요" required rows={6}
                style={{ ...inputStyle, resize: 'vertical' }}
                onFocus={e => { e.target.style.borderColor = 'var(--shop-ink)' }}
                onBlur={e =>  { e.target.style.borderColor = 'var(--shop-border)' }} />
            </div>

            {/* 파일 첨부 */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--shop-ink2)' }}>
                파일 첨부 <span style={{ color: 'var(--shop-ink3)' }}>(최대 5개, JPG·PNG·PDF·10MB)</span>
              </label>
              <div
                className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors"
                style={{ borderColor: 'var(--shop-border)' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <p className="text-sm" style={{ color: 'var(--shop-ink3)' }}>클릭하여 파일 선택</p>
                <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf" className="hidden"
                  onChange={e => {
                    const f = Array.from(e.target.files ?? []).slice(0, 5)
                    setFiles(f); uploadFiles(f)
                  }} />
              </div>
              {uploading && <p className="text-xs mt-1.5" style={{ color: 'var(--shop-ink3)' }}>업로드 중...</p>}
              {uploadedUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {uploadedUrls.map((url, i) => (
                    <div key={i} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                      style={{ background: 'var(--shop-bg2)', border: '1px solid var(--shop-border)', color: 'var(--shop-ink2)' }}>
                      📎 첨부파일 {i + 1}
                      <button type="button" onClick={() => setUploadedUrls(p => p.filter((_, j) => j !== i))}
                        style={{ color: 'var(--shop-ink3)' }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <p className="text-xs py-2 px-3 rounded-lg"
                style={{ color: 'var(--shop-accent)', background: 'rgba(196,80,58,0.08)' }}>{error}</p>
            )}

            <button type="submit" disabled={loading || uploading}
              className="w-full py-4 rounded-2xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'var(--shop-ink)', color: 'white' }}>
              {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              문의 제출
            </button>
          </form>
        )
      )}

      {/* ── FAQ 탭 ── */}
      {tab === 'faq' && (
        <div>
          {/* 카테고리 필터 */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button onClick={() => setFaqCat('')}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: !faqCat ? 'var(--shop-ink)' : 'var(--shop-bg2)',
                color:      !faqCat ? 'white' : 'var(--shop-ink2)',
                border:     !faqCat ? 'none'  : '1px solid var(--shop-border)',
              }}>전체</button>
            {CATEGORIES.map(([key, label]) => (
              <button key={key} onClick={() => setFaqCat(key)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background: faqCat === key ? 'var(--shop-ink)' : 'var(--shop-bg2)',
                  color:      faqCat === key ? 'white' : 'var(--shop-ink2)',
                  border:     faqCat === key ? 'none'  : '1px solid var(--shop-border)',
                }}>{label}</button>
            ))}
          </div>

          {faqs.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--shop-ink3)' }}>
              <p className="text-3xl sm:text-4xl mb-3">💬</p>
              <p>등록된 FAQ가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-2">
              {faqs.map(faq => (
                <div key={faq.id} className="rounded-xl overflow-hidden"
                  style={{ border: '1.5px solid var(--shop-border)' }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
                    style={{ background: openFaq === faq.id ? 'var(--shop-bg2)' : 'var(--shop-bg)' }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'var(--shop-bg3)', color: 'var(--shop-ink3)' }}>
                        {INQUIRY_CATEGORY_LABEL[faq.category]}
                      </span>
                      <span className="text-sm font-medium" style={{ color: 'var(--shop-ink)' }}>
                        {faq.question}
                      </span>
                    </div>
                    <span className="text-lg flex-shrink-0 ml-3" style={{ color: 'var(--shop-ink3)' }}>
                      {openFaq === faq.id ? '−' : '+'}
                    </span>
                  </button>
                  {openFaq === faq.id && (
                    <div className="px-5 py-4 text-sm leading-relaxed border-t"
                      style={{ borderColor: 'var(--shop-border)', color: 'var(--shop-ink2)', background: 'var(--shop-bg)' }}>
                      <div className="whitespace-pre-wrap">{faq.answer}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-8 pt-6" style={{ borderTop: '1px solid var(--shop-border)' }}>
            <p className="text-sm mb-3" style={{ color: 'var(--shop-ink3)' }}>원하는 답변을 찾지 못하셨나요?</p>
            <button onClick={() => setTab('inquiry')}
              className="px-6 py-2.5 rounded-full text-sm font-semibold"
              style={{ background: 'var(--shop-ink)', color: 'white' }}>
              1:1 문의하기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
