import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { siteConfig } from '@/lib/seo'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  const baseUrl  = siteConfig.url

  // ── 정적 페이지 ──────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    {
      url:              `${baseUrl}/shop`,
      lastModified:     new Date(),
      changeFrequency:  'daily',
      priority:         1.0,
    },
    {
      url:              `${baseUrl}/shop/products`,
      lastModified:     new Date(),
      changeFrequency:  'hourly',
      priority:         0.9,
    },
    {
      url:              `${baseUrl}/shop/auth/login`,
      lastModified:     new Date(),
      changeFrequency:  'monthly',
      priority:         0.3,
    },
    {
      url:              `${baseUrl}/shop/auth/register`,
      lastModified:     new Date(),
      changeFrequency:  'monthly',
      priority:         0.3,
    },
    {
      url:              `${baseUrl}/shop/cart`,
      changeFrequency:  'never',
      priority:         0.2,
    },
  ]

  // ── 카테고리 페이지 ───────────────────────────────────────────
  const { data: categories } = await supabase
    .from('categories')
    .select('name')
    .eq('level', 1)
    .order('sort_order')

  const categoryPages: MetadataRoute.Sitemap = (categories ?? []).map(cat => ({
    url:             `${baseUrl}/shop/products?cat=${encodeURIComponent(cat.name)}`,
    lastModified:    new Date(),
    changeFrequency: 'daily',
    priority:        0.8,
  }))

  // ── 상품 상세 페이지 ──────────────────────────────────────────
  const { data: products } = await supabase
    .from('products')
    .select('id, updated_at')
    .in('status', ['sale', 'soldout'])
    .order('updated_at', { ascending: false })

  const productPages: MetadataRoute.Sitemap = (products ?? []).map(product => ({
    url:             `${baseUrl}/shop/products/${product.id}`,
    lastModified:    new Date(product.updated_at),
    changeFrequency: 'weekly',
    priority:        0.7,
  }))

  return [...staticPages, ...categoryPages, ...productPages]
}
