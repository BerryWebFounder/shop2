'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'

// ── 읽기 전용 별점 표시 ───────────────────────────────────────────
export function StarDisplay({
  rating,
  size = 'md',
  showNumber = false,
  count,
}: {
  rating:      number   // 0–5 (소수 가능)
  size?:       'xs' | 'sm' | 'md' | 'lg'
  showNumber?: boolean
  count?:      number
}) {
  const sizes = { xs: 10, sm: 13, md: 16, lg: 22 }
  const px    = sizes[size]

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(i => {
          const fill = Math.min(1, Math.max(0, rating - (i - 1)))
          return (
            <StarSvg key={i} fill={fill} size={px} />
          )
        })}
      </div>
      {showNumber && (
        <span
          className="font-semibold tabular-nums"
          style={{ fontSize: px * 0.9, color: 'var(--shop-ink2)' }}
        >
          {rating.toFixed(1)}
        </span>
      )}
      {count !== undefined && (
        <span style={{ fontSize: px * 0.8, color: 'var(--shop-ink3)' }}>
          ({count.toLocaleString()})
        </span>
      )}
    </div>
  )
}

// 관리자 다크 테마용
export function AdminStarDisplay({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24">
          <polygon
            points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
            fill={i <= rating ? '#f59e0b' : 'none'}
            stroke="#f59e0b"
            strokeWidth="1.5"
          />
        </svg>
      ))}
      <span className="text-xs font-mono ml-1 text-ink-2">{rating.toFixed(1)}</span>
    </div>
  )
}

// ── 입력용 별점 선택기 ────────────────────────────────────────────
export function StarPicker({
  value,
  onChange,
  size = 28,
}: {
  value:    number
  onChange: (rating: number) => void
  size?:    number
}) {
  const [hover, setHover] = useState(0)
  const display = hover || value

  const LABELS = ['', '별로예요', '그저 그래요', '보통이에요', '좋아요', '최고예요!']

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(i)}
            className="transition-transform hover:scale-110 active:scale-95"
            aria-label={`${i}점`}
          >
            <StarSvg
              fill={i <= display ? 1 : 0}
              size={size}
              color={i <= display ? '#f59e0b' : '#d1d5db'}
            />
          </button>
        ))}
      </div>
      {display > 0 && (
        <span className="text-sm font-medium" style={{ color: 'var(--shop-ink2)' }}>
          {LABELS[display]}
        </span>
      )}
    </div>
  )
}

// ── SVG 별 (부분 채움 지원) ───────────────────────────────────────
function StarSvg({
  fill,
  size,
  color = '#f59e0b',
}: {
  fill:  number   // 0–1
  size:  number
  color?: string
}) {
  const id = `star-grad-${Math.random().toString(36).slice(2, 6)}`
  const emptyColor = '#e5e7eb'

  if (fill <= 0)   return <FullStar size={size} fillColor={emptyColor} />
  if (fill >= 1)   return <FullStar size={size} fillColor={color} />

  // 부분 채움 (소수 별점용)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor={color} />
          <stop offset={`${fill * 100}%`} stopColor={emptyColor} />
        </linearGradient>
      </defs>
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill={`url(#${id})`}
        stroke={color}
        strokeWidth="0.5"
      />
    </svg>
  )
}

function FullStar({ size, fillColor }: { size: number; fillColor: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill={fillColor}
        stroke={fillColor === '#e5e7eb' ? fillColor : fillColor}
        strokeWidth="0.5"
      />
    </svg>
  )
}
