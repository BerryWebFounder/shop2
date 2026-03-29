'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface Popup {
  id:           string
  title:        string | null
  body:         string | null
  image_url:    string | null
  link_url:     string | null
  link_text:    string
  width:        number
  position:     string
  show_close:   boolean
  close_text:   string
  dismiss_days: number
  dismiss_text: string
}

// 쿠키 헬퍼
function getDismissCookie(id: string): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some(c => c.trim().startsWith(`popup_dismiss_${id}=`))
}

function setDismissCookie(id: string, days: number) {
  const exp = new Date()
  exp.setDate(exp.getDate() + days)
  document.cookie = `popup_dismiss_${id}=1; expires=${exp.toUTCString()}; path=/`
}

export function PopupModal({ popups }: { popups: Popup[] }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null)

  useEffect(() => {
    // 표시할 첫 번째 팝업 찾기 (dismiss 쿠키 없는 것)
    const idx = popups.findIndex(p => !getDismissCookie(p.id))
    if (idx !== -1) {
      // 300ms 딜레이 후 표시 (페이지 로드 후)
      const timer = setTimeout(() => setActiveIdx(idx), 300)
      return () => clearTimeout(timer)
    }
  }, [popups])

  if (activeIdx === null || !popups[activeIdx]) return null
  const popup = popups[activeIdx]

  function close() { setActiveIdx(null) }
  function dismiss() {
    if (popup.dismiss_days > 0) setDismissCookie(popup.id, popup.dismiss_days)
    close()
  }

  const positionClass = {
    'center':       'items-center justify-center',
    'bottom-left':  'items-end justify-start p-4',
    'bottom-right': 'items-end justify-end p-4',
  }[popup.position] ?? 'items-center justify-center'

  return (
    <div
      className={`fixed inset-0 z-[200] flex ${positionClass} shop-animate-in`}
      style={{ background: popup.position === 'center' ? 'rgba(0,0,0,0.6)' : 'transparent' }}
      onClick={popup.position === 'center' ? close : undefined}
    >
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl shop-animate-up"
        style={{ width: Math.min(popup.width, window.innerWidth - 32), maxWidth: '100%' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        {popup.show_close && (
          <button
            onClick={close}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors hover:bg-black/10"
            style={{ background: 'rgba(0,0,0,0.3)', color: 'white' }}
          >
            ×
          </button>
        )}

        {/* 이미지 */}
        {popup.image_url && (
          <div className="relative" style={{ paddingBottom: '56.25%' }}>
            <Image
              src={popup.image_url}
              alt={popup.title ?? '팝업'}
              fill
              className="object-cover"
              sizes="480px"
            />
          </div>
        )}

        {/* 텍스트 콘텐츠 */}
        {(popup.title || popup.body || popup.link_url) && (
          <div className="p-6" style={{ background: 'var(--shop-bg)' }}>
            {popup.title && (
              <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}>
                {popup.title}
              </h3>
            )}
            {popup.body && (
              <div className="text-sm leading-relaxed mb-4" style={{ color: 'var(--shop-ink2)' }}
                dangerouslySetInnerHTML={{ __html: popup.body }} />
            )}
            {popup.link_url && (
              <Link href={popup.link_url}
                className="inline-block px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: 'var(--shop-ink)', color: 'white' }}
                onClick={close}>
                {popup.link_text}
              </Link>
            )}
          </div>
        )}

        {/* 하단 액션 */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ background: 'var(--shop-bg2)', borderTop: '1px solid var(--shop-border)' }}
        >
          {popup.dismiss_days > 0 ? (
            <button onClick={dismiss} className="text-xs" style={{ color: 'var(--shop-ink3)' }}>
              {popup.dismiss_text}
            </button>
          ) : <span />}
          <button onClick={close} className="text-xs font-medium" style={{ color: 'var(--shop-ink2)' }}>
            {popup.close_text}
          </button>
        </div>
      </div>
    </div>
  )
}
