'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface Slide {
  id:            string
  title:         string | null
  subtitle:      string | null
  description:   string | null
  image_url:     string
  image_mobile:  string | null
  overlay_color: string
  cta_text:      string | null
  cta_url:       string | null
  cta_style:     string
  text_align:    string
  text_color:    string
}

interface HeroSliderProps {
  slides:        Slide[]
  autoPlayMs?:   number   // 0 = 자동재생 없음
  height?:       string
}

export function HeroSlider({ slides, autoPlayMs = 5000, height = 'clamp(420px, 70vh, 720px)' }: HeroSliderProps) {
  const [current,  setCurrent]  = useState(0)
  const [paused,   setPaused]   = useState(false)
  const [animate,  setAnimate]  = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const goTo = useCallback((idx: number) => {
    setAnimate(true)
    setCurrent(idx)
    setTimeout(() => setAnimate(false), 600)
  }, [])

  const next = useCallback(() => {
    goTo((current + 1) % slides.length)
  }, [current, slides.length, goTo])

  const prev = useCallback(() => {
    goTo((current - 1 + slides.length) % slides.length)
  }, [current, slides.length, goTo])

  // 자동 재생
  useEffect(() => {
    if (!autoPlayMs || paused || slides.length <= 1) return
    timerRef.current = setTimeout(next, autoPlayMs)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [current, paused, autoPlayMs, next, slides.length])

  if (slides.length === 0) return null
  const slide = slides[current]

  const textAlignClass = {
    left:   'items-start text-left',
    center: 'items-center text-center',
    right:  'items-end text-right',
  }[slide.text_align] ?? 'items-center text-center'

  const ctaBtnStyle = {
    light:   { background: 'white', color: '#1A1A18' },
    dark:    { background: '#1A1A18', color: 'white' },
    outline: { background: 'transparent', color: 'white', border: '2px solid white' },
  }[slide.cta_style] ?? { background: 'white', color: '#1A1A18' }

  return (
    <section
      className="relative overflow-hidden"
      style={{ height }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* 배경 이미지 */}
      <div className={`absolute inset-0 transition-opacity duration-600 ${animate ? 'opacity-80' : 'opacity-100'}`}>
        <Image
          src={slide.image_url}
          alt={slide.title ?? '슬라이드'}
          fill
          className="object-cover transition-transform duration-700 scale-105"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0" style={{ background: slide.overlay_color }} />
      </div>

      {/* 콘텐츠 */}
      <div
        className={`relative h-full flex flex-col justify-center px-5 md:px-12 lg:px-20 gap-3 ${textAlignClass}`}
        style={{ color: slide.text_color }}
      >
        {slide.subtitle && (
          <p className="text-xs md:text-sm uppercase tracking-[4px] font-medium opacity-80 shop-animate-up"
            style={{ animationDelay: '100ms' }}>
            {slide.subtitle}
          </p>
        )}
        {slide.title && (
          <h1
            className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold leading-tight shop-animate-up"
            style={{ fontFamily: 'var(--font-display)', animationDelay: '200ms', letterSpacing: '-0.02em' }}
          >
            {slide.title}
          </h1>
        )}
        {slide.description && (
          <p className="text-sm md:text-base max-w-lg opacity-80 leading-relaxed shop-animate-up"
            style={{ animationDelay: '300ms' }}>
            {slide.description}
          </p>
        )}
        {slide.cta_text && slide.cta_url && (
          <div className="shop-animate-up" style={{ animationDelay: '400ms' }}>
            <Link
              href={slide.cta_url}
              className="inline-block px-6 py-3 md:px-8 md:py-3.5 rounded-full text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
              style={ctaBtnStyle}
            >
              {slide.cta_text}
            </Link>
          </div>
        )}
      </div>

      {/* 이전/다음 */}
      {slides.length > 1 && (
        <>
          <button onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-white/20 text-white text-xl"
            style={{ background: 'rgba(0,0,0,0.2)' }}>
            ‹
          </button>
          <button onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-white/20 text-white text-xl"
            style={{ background: 'rgba(0,0,0,0.2)' }}>
            ›
          </button>
        </>
      )}

      {/* 인디케이터 도트 */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="transition-all rounded-full"
              style={{
                width:   i === current ? 24 : 8,
                height:  8,
                background: i === current ? 'white' : 'rgba(255,255,255,0.5)',
              }}
            />
          ))}
        </div>
      )}

      {/* 진행 바 */}
      {autoPlayMs > 0 && slides.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5">
          <div
            key={current}
            className="h-full bg-white/60"
            style={{
              animation: paused ? 'none' : `slideProgress ${autoPlayMs}ms linear forwards`,
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes slideProgress {
          from { width: 0; }
          to   { width: 100%; }
        }
      `}</style>
    </section>
  )
}
