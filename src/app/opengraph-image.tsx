// src/app/opengraph-image.tsx
// Next.js의 ImageResponse로 동적 OG 이미지 생성
// 접근: /opengraph-image

import { ImageResponse } from 'next/og'
import { createClient }  from '@/lib/supabase/server'
import { siteConfig }    from '@/lib/seo'

export const runtime = 'edge'
export const alt     = '쇼핑몰 대표 이미지'
export const size    = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage() {
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('admin_settings').select('store_name').single()
  const storeName = settings?.store_name ?? siteConfig.name

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          background: '#1A1A18',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'serif',
        }}
      >
        {/* 배경 패턴 */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(196,80,58,0.15) 0%, transparent 60%)',
        }} />

        {/* 로고/이름 */}
        <div style={{
          fontSize: 80, fontWeight: 700, color: '#FAFAF8',
          letterSpacing: '-2px', marginBottom: 20,
        }}>
          {storeName}
        </div>

        {/* 슬로건 */}
        <div style={{
          fontSize: 28, color: '#9C9B96',
          letterSpacing: '2px',
        }}>
          Style Refined.
        </div>

        {/* 포인트 라인 */}
        <div style={{
          width: 60, height: 3,
          background: '#C4503A',
          marginTop: 32,
          borderRadius: 2,
        }} />
      </div>
    ),
    { ...size }
  )
}
