import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(1, '상품명을 입력하세요').max(200),
  summary: z.string().max(500).optional().default(''),
  description: z.string().optional().default(''),
  cat1_id: z.string().uuid().nullable().optional(),
  cat2_id: z.string().uuid().nullable().optional(),
  cat3_id: z.string().uuid().nullable().optional(),
  price: z.number().int().min(0, '가격은 0 이상이어야 합니다'),
  sale_price: z.number().int().min(0).nullable().optional(),
  stock: z.number().int().min(0, '재고는 0 이상이어야 합니다'),
  status: z.enum(['sale', 'soldout', 'stop']),
})

export const categorySchema = z.object({
  parent_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1, '분류명을 입력하세요').max(100),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  sort_order: z.number().int().min(0).default(0),
  description: z.string().max(500).optional().default(''),
})

export const eventSchema = z.object({
  name: z.string().min(1, '이벤트명을 입력하세요').max(200),
  description: z.string().max(1000).optional().default(''),
  start_date: z.string().min(1, '시작일을 입력하세요'),
  end_date: z.string().min(1, '종료일을 입력하세요'),
  status: z.enum(['active', 'scheduled', 'ended']),
})

export const displaySchema = z.object({
  product_id: z.string().uuid('상품을 선택하세요'),
  event_id: z.string().uuid().nullable().optional(),
  display_type: z.enum(['default', 'event']),
  start_date: z.string().min(1, '시작일을 입력하세요'),
  end_date: z.string().min(1, '종료일을 입력하세요'),
  sort_order: z.number().int().min(0).default(0),
})

export const settingsSchema = z.object({
  store_name: z.string().min(1, '상호명을 입력하세요').max(200),
  biz_no: z.string().max(20).optional().default(''),
  address: z.string().max(500).optional().default(''),
  phone: z.string().max(20).optional().default(''),
  email: z.string().email('올바른 이메일 형식이 아닙니다').or(z.literal('')).optional().default(''),
  dormant_days: z.number().int().min(1).max(3650).default(365),
  data_keep_years: z.number().int().min(1).max(10).default(4),
})

export const memberStatusSchema = z.object({
  status: z.enum(['active', 'dormant', 'withdrawn']),
})

export type ProductInput = z.infer<typeof productSchema>
export type CategoryInput = z.infer<typeof categorySchema>
export type EventInput = z.infer<typeof eventSchema>
export type DisplayInput = z.infer<typeof displaySchema>
export type SettingsInput = z.infer<typeof settingsSchema>
