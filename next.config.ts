import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 이미지 도메인 (Supabase Storage)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },

  // Service Worker 캐시 헤더
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control',          value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type',           value: 'application/javascript; charset=utf-8' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  },

  // 웹훅 bodyParser 비활성화
  // (토스 HMAC 검증을 위해 raw body가 필요)
  // Next.js 15는 기본으로 raw body 지원
}

export default nextConfig
