import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // 일반 봇: 쇼핑몰 공개 페이지 허용
        userAgent: '*',
        allow:  ['/shop/', '/shop/products', '/shop/products/'],
        disallow: [
          '/admin/',         // 관리자 페이지 차단
          '/shop/cart',      // 장바구니 (세션 기반, 인덱싱 불필요)
          '/shop/checkout',  // 결제 페이지 차단
          '/shop/orders',    // 주문 내역 차단
          '/shop/auth/',     // 인증 페이지 차단
          '/api/',           // API 엔드포인트 차단
        ],
      },
      {
        // Google 이미지 봇: 상품 이미지 수집 허용
        userAgent: 'Googlebot-Image',
        allow:     ['/'],
      },
      {
        // 악성 봇 차단
        userAgent: ['AhrefsBot', 'SemrushBot', 'MJ12bot'],
        disallow:  ['/'],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host:    siteConfig.url,
  }
}
