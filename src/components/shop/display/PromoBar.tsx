'use client'
import { useState } from 'react'
import Link from 'next/link'

interface PromoBarData {
  id:         string
  message:    string
  link_url:   string | null
  link_text:  string | null
  bg_color:   string
  text_color: string
  show_close: boolean
}

export function PromoBar({ bar }: { bar: PromoBarData }) {
  const [visible, setVisible] = useState(true)
  if (!visible) return null

  return (
    <div
      className="w-full py-2.5 px-4 flex items-center justify-center gap-3 text-sm text-center"
      style={{ background: bar.bg_color, color: bar.text_color }}
    >
      <span className="flex-1" dangerouslySetInnerHTML={{ __html: bar.message }} />
      {bar.link_url && bar.link_text && (
        <Link
          href={bar.link_url}
          className="underline text-xs font-medium opacity-80 hover:opacity-100 flex-shrink-0"
        >
          {bar.link_text}
        </Link>
      )}
      {bar.show_close && (
        <button
          onClick={() => setVisible(false)}
          className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs hover:bg-white/20 transition-colors"
          style={{ color: bar.text_color }}
        >
          ×
        </button>
      )}
    </div>
  )
}

// 여러 프로모 바를 순환 표시 (선택)
export function RotatingPromoBar({ bars, intervalMs = 4000 }: { bars: PromoBarData[]; intervalMs?: number }) {
  const [idx,     setIdx]     = useState(0)
  const [visible, setVisible] = useState(true)

  // 자동 순환
  useState(() => {
    if (bars.length <= 1) return
    const timer = setInterval(() => setIdx(i => (i + 1) % bars.length), intervalMs)
    return () => clearInterval(timer)
  })

  if (!visible || bars.length === 0) return null
  const bar = bars[idx]

  return (
    <div
      className="w-full py-2.5 px-4 flex items-center justify-center gap-3 text-sm"
      style={{ background: bar.bg_color, color: bar.text_color, transition: 'background 0.4s' }}
    >
      <span className="flex-1 text-center" dangerouslySetInnerHTML={{ __html: bar.message }} />
      {bar.link_url && bar.link_text && (
        <Link href={bar.link_url} className="underline text-xs font-medium opacity-80 hover:opacity-100 flex-shrink-0">
          {bar.link_text}
        </Link>
      )}
      {bar.show_close && (
        <button onClick={() => setVisible(false)}
          className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs hover:bg-white/20 transition-colors">
          ×
        </button>
      )}
    </div>
  )
}
