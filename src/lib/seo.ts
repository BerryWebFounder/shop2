import type { Metadata } from 'next'

// ── 기본 사이트 설정 ──────────────────────────────────────────────
// 실제 운영 시 .env에서 NEXT_PUBLIC_SITE_URL로 관리
const SITE_URL  = process.env.NEXT_PUBLIC_SITE_URL  ?? 'https://your-shop.vercel.app'
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? '쇼핑몰'

export const siteConfig = {
  url:         SITE_URL,
  name:        SITE_NAME,
  description: '엄선된 상품과 합리적인 가격으로 최고의 쇼핑 경험을 제공합니다.',
  locale:      'ko_KR',
  twitterHandle: '',   // '@your_handle'
}

// ── 공통 메타데이터 빌더 ──────────────────────────────────────────
export function buildMetadata({
  title,
  description,
  path       = '',
  image,
  noIndex    = false,
  keywords   = [],
}: {
  title?:       string
  description?: string
  path?:        string
  image?:       string
  noIndex?:     boolean
  keywords?:    string[]
}): Metadata {
  const fullTitle = title
    ? `${title} | ${siteConfig.name}`
    : siteConfig.name

  const desc = description ?? siteConfig.description
  const url  = `${siteConfig.url}${path}`
  const ogImage = image ?? `${siteConfig.url}/og-default.png`

  return {
    title: fullTitle,
    description: desc,
    keywords: keywords.length ? keywords : undefined,

    // Canonical URL
    alternates: { canonical: url },

    // Open Graph
    openGraph: {
      title:       fullTitle,
      description: desc,
      url,
      siteName:    siteConfig.name,
      locale:      siteConfig.locale,
      type:        'website',
      images: [{
        url:    ogImage,
        width:  1200,
        height: 630,
        alt:    fullTitle,
      }],
    },

    // Twitter Card
    twitter: {
      card:        'summary_large_image',
      title:       fullTitle,
      description: desc,
      images:      [ogImage],
      ...(siteConfig.twitterHandle && { site: siteConfig.twitterHandle }),
    },

    // 크롤링 제어
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true,  follow: true, googleBot: { index: true, follow: true } },
  }
}

// ── 상품 메타데이터 빌더 ─────────────────────────────────────────
export function buildProductMetadata({
  id,
  name,
  description,
  price,
  salePrice,
  imageUrl,
  categoryName,
}: {
  id:           string
  name:         string
  description?: string | null
  price:        number
  salePrice?:   number | null
  imageUrl?:    string | null
  categoryName?: string | null
}): Metadata {
  const effectivePrice = salePrice ?? price
  const desc = description
    ? description.replace(/<[^>]*>/g, '').slice(0, 160)  // HTML 태그 제거
    : `${name} - ${new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(effectivePrice)}`

  const path  = `/shop/products/${id}`
  const url   = `${siteConfig.url}${path}`
  const image = imageUrl ?? `${siteConfig.url}/og-default.png`

  return {
    title:       `${name} | ${siteConfig.name}`,
    description: desc,
    keywords:    [name, categoryName ?? '', siteConfig.name].filter(Boolean),
    alternates:  { canonical: url },

    openGraph: {
      title:       name,
      description: desc,
      url,
      siteName:    siteConfig.name,
      locale:      siteConfig.locale,
      type:        'website',
      images: [{ url: image, width: 800, height: 1000, alt: name }],
    },

    twitter: {
      card:        'summary_large_image',
      title:       name,
      description: desc,
      images:      [image],
    },

    // 구조화 데이터 (JSON-LD) — 별도 컴포넌트로 삽입
    other: {
      'product:price:amount':   String(effectivePrice),
      'product:price:currency': 'KRW',
    },
  }
}

// ── JSON-LD 구조화 데이터 ────────────────────────────────────────
export function productJsonLd({
  id, name, description, price, salePrice, imageUrl, rating, reviewCount,
}: {
  id:           string
  name:         string
  description?: string | null
  price:        number
  salePrice?:   number | null
  imageUrl?:    string | null
  rating?:      number | null
  reviewCount?: number
}) {
  const effectivePrice = salePrice ?? price
  return {
    '@context':   'https://schema.org',
    '@type':      'Product',
    name,
    description:  description?.replace(/<[^>]*>/g, '').slice(0, 5000) ?? name,
    image:        imageUrl ? [imageUrl] : undefined,
    url:          `${siteConfig.url}/shop/products/${id}`,
    offers: {
      '@type':       'Offer',
      price:         effectivePrice,
      priceCurrency: 'KRW',
      availability:  'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: siteConfig.name },
    },
    ...(rating && reviewCount && {
      aggregateRating: {
        '@type':       'AggregateRating',
        ratingValue:   rating,
        reviewCount,
        bestRating:    5,
        worstRating:   1,
      },
    }),
  }
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type':    'Organization',
    name:       siteConfig.name,
    url:        siteConfig.url,
    logo:       `${siteConfig.url}/logo.png`,
  }
}

export function websiteJsonLd() {
  return {
    '@context':        'https://schema.org',
    '@type':           'WebSite',
    name:              siteConfig.name,
    url:               siteConfig.url,
    potentialAction: {
      '@type':       'SearchAction',
      target:        `${siteConfig.url}/shop/products?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context':    'https://schema.org',
    '@type':       'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type':   'ListItem',
      position:  idx + 1,
      name:      item.name,
      item:      `${siteConfig.url}${item.url}`,
    })),
  }
}
