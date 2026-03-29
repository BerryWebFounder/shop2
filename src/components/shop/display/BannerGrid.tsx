'use client'
import Image from 'next/image'
import Link from 'next/link'

interface Banner {
  id:            string
  title:         string | null
  subtitle:      string | null
  image_url:     string
  link_url:      string | null
  badge_text:    string | null
  badge_color:   string
  overlay_color: string
  text_position: string
  text_color:    string
  position:      string
}

// position → grid-col span 계산
const POSITION_SPAN: Record<string, string> = {
  full:    'col-span-2',
  half:    'col-span-1',
  third:   'md:col-span-1',
  quarter: 'md:col-span-1',
}

const POSITION_RATIO: Record<string, string> = {
  full:    '50%',   // 2:1
  half:    '100%',  // 1:1
  third:   '120%',  // 5:6
  quarter: '140%',
}

const TEXT_POS_CLASS: Record<string, string> = {
  'top-left':     'top-4 left-4 items-start justify-start',
  'center':       'inset-0 items-center justify-center text-center',
  'bottom-left':  'bottom-4 left-4 items-start justify-end',
  'bottom-right': 'bottom-4 right-4 items-end justify-end text-right',
}

export function BannerGrid({ banners }: { banners: Banner[] }) {
  if (banners.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4">
      {banners.map(banner => {
        const spanClass = POSITION_SPAN[banner.position] ?? 'col-span-1'
        const ratio     = POSITION_RATIO[banner.position] ?? '100%'
        const textClass = TEXT_POS_CLASS[banner.text_position] ?? TEXT_POS_CLASS['bottom-left']

        const content = (
          <div
            className="relative overflow-hidden rounded-2xl group"
            style={{ paddingBottom: ratio }}
          >
            <Image
              src={banner.image_url}
              alt={banner.title ?? '배너'}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
            <div className="absolute inset-0" style={{ background: banner.overlay_color }} />

            {/* 뱃지 */}
            {banner.badge_text && (
              <span
                className="absolute top-3 left-3 text-[11px] font-bold px-2 py-0.5 rounded-full text-white z-10"
                style={{ background: banner.badge_color }}
              >
                {banner.badge_text}
              </span>
            )}

            {/* 텍스트 */}
            {(banner.title || banner.subtitle) && (
              <div
                className={`absolute flex flex-col gap-1 p-3 ${textClass}`}
                style={{ color: banner.text_color }}
              >
                {banner.title && (
                  <p className="text-sm md:text-base font-bold leading-tight">{banner.title}</p>
                )}
                {banner.subtitle && (
                  <p className="text-xs opacity-80">{banner.subtitle}</p>
                )}
              </div>
            )}
          </div>
        )

        return (
          <div key={banner.id} className={spanClass}>
            {banner.link_url ? (
              <Link href={banner.link_url} className="block">{content}</Link>
            ) : content}
          </div>
        )
      })}
    </div>
  )
}
