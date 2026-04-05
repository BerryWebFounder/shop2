// ================================================================
// src/lib/types/v2.ts
// 상점(V2) 플랫폼 공통 타입 — 단일 진실 공급원 (Single Source of Truth)
//
// 이전에 아래 파일들에 분산·중복되어 있던 타입을 통합합니다:
//   - src/app/seller/store/types.ts     (SellerStore, StoreUpdateData)
//   - src/app/seller/products/types.ts  (Product, ProductFormData, SellerStore 중복)
//   - src/app/seller/orders/types.ts    (OrderItem, Settlement, SellerStore 중복)
//   - src/app/admin/sellers/types.ts    (SellerApplication)
// ================================================================

// ── 공통 유틸 ────────────────────────────────────────────────────
export type Nullable<T> = T | null

// ================================================================
// 1. 사용자 / 판매자 신청
// ================================================================

export type UserRole     = 'customer' | 'seller' | 'admin'
export type SellerStatus = 'pending'  | 'approved' | 'rejected' | 'suspended'

export type BusinessType      = 'individual' | 'corporation'
export type ApplicationStatus = 'pending' | 'approved' | 'rejected'

export interface SellerApplication {
  id:              string
  user_id:         string
  business_name:   string
  business_type:   BusinessType
  business_number: Nullable<string>
  representative:  string
  phone:           string
  email:           string
  address:         string
  store_name:      string
  store_slug:      string
  store_category:  string
  store_intro:     Nullable<string>
  id_document_url: Nullable<string>
  biz_doc_url:     Nullable<string>
  status:          ApplicationStatus
  admin_note:      Nullable<string>
  reviewed_by:     Nullable<string>
  reviewed_at:     Nullable<string>
  created_at:      string
  updated_at:      string
}

// ================================================================
// 2. 상점 (SellerStore)
// ================================================================

export type StoreStatus = 'active' | 'suspended' | 'closed'

export interface SellerStore {
  id:              string
  owner_id:        string
  store_name:      string
  slug:            string
  tagline:         Nullable<string>
  intro:           Nullable<string>
  store_category:  string
  logo_url:        Nullable<string>
  banner_url:      Nullable<string>
  theme_color:     string
  shipping_policy: Nullable<string>
  return_policy:   Nullable<string>
  fee_rate:        number
  contact_email:   Nullable<string>
  contact_phone:   Nullable<string>
  sns_links:       Record<string, string>
  status:          StoreStatus
  total_products:  number
  total_orders:    number
  total_revenue:   number
  created_at:      string
  updated_at:      string
}

/** PATCH 시 전송할 수정 가능 필드만 추출 */
export type StoreUpdateData = Partial<Pick<SellerStore,
  | 'store_name'
  | 'tagline'
  | 'intro'
  | 'store_category'
  | 'logo_url'
  | 'banner_url'
  | 'theme_color'
  | 'shipping_policy'
  | 'return_policy'
  | 'contact_email'
  | 'contact_phone'
  | 'sns_links'
>>

// ================================================================
// 3. 판매자 상품
// ================================================================

export type ProductStatus = 'active' | 'draft' | 'sold_out' | 'hidden'

export interface ProductOption {
  name:   string
  values: string[]
}

export interface ProductVariant {
  sku:        string
  price:      number
  stock:      number
  options:    Record<string, string>
  image_url?: string
}

export interface SellerProduct {
  id:              string
  store_id:        string
  name:            string
  description:     Nullable<string>
  price:           number
  compare_price:   Nullable<number>
  cost_price:      Nullable<number>
  category:        Nullable<string>
  tags:            string[]
  images:          string[]
  track_inventory: boolean
  stock_quantity:  number
  low_stock_alert: Nullable<number>
  has_options:     boolean
  options:         ProductOption[]
  variants:        ProductVariant[]
  meta_title:      Nullable<string>
  meta_desc:       Nullable<string>
  status:          ProductStatus
  created_at:      string
  updated_at:      string
}

export interface ProductFormData {
  name:            string
  description:     string
  price:           number
  compare_price:   number | undefined
  cost_price:      number | undefined
  category:        string
  tags:            string[]
  images:          string[]
  track_inventory: boolean
  stock_quantity:  number
  low_stock_alert: number
  has_options:     boolean
  options:         ProductOption[]
  variants:        ProductVariant[]
  status:          ProductStatus
}

export const EMPTY_PRODUCT_FORM: ProductFormData = {
  name: '', description: '', price: 0,
  compare_price: undefined, cost_price: undefined,
  category: '', tags: [], images: [],
  track_inventory: true, stock_quantity: 0, low_stock_alert: 5,
  has_options: false, options: [], variants: [], status: 'draft',
}

// ================================================================
// 4. 주문 / 주문 아이템
// ================================================================

export type OrderStatus = 'pending' | 'paid' | 'preparing' | 'shipping'
                        | 'delivered' | 'cancelled' | 'refunded'

export type OrderItemStatus = 'pending' | 'preparing' | 'shipping'
                            | 'delivered' | 'cancelled'

/** 판매자 관점에서 조회하는 주문 정보 (order_items 에 join된 orders 필드) */
export interface OrderSummary {
  order_number:   string
  shipping_name:  string
  shipping_phone: string
  shipping_addr:  string
  created_at:     string
}

export interface OrderItem {
  id:               string
  order_id:         string
  store_id:         string
  product_id:       string
  product_name:     string
  product_image:    Nullable<string>
  options_snapshot: Record<string, unknown>
  quantity:         number
  unit_price:       number
  total_price:      number
  item_status:      OrderItemStatus
  tracking_number:  Nullable<string>
  carrier_code:     Nullable<string>
  created_at:       string
  updated_at:       string
  /** Supabase select join으로 함께 조회 */
  order?:           OrderSummary
}

// ================================================================
// 5. 정산
// ================================================================

export type SettlementStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Settlement {
  id:             string
  store_id:       string
  period_start:   string
  period_end:     string
  gross_amount:   number
  fee_rate:       number
  fee_amount:     number
  net_amount:     number
  bank_name:      Nullable<string>
  account_number: Nullable<string>
  account_holder: Nullable<string>
  status:         SettlementStatus
  paid_at:        Nullable<string>
  admin_note:     Nullable<string>
  created_at:     string
  updated_at:     string
  items?:         SettlementItem[]
}

export interface SettlementItem {
  id:            string
  settlement_id: string
  order_item_id: string
  order_number:  string
  product_name:  string
  quantity:      number
  gross_amount:  number
  fee_amount:    number
  net_amount:    number
  delivered_at:  Nullable<string>
  created_at:    string
}

// ================================================================
// 6. 알림
// ================================================================

export type NotificationType =
  | 'application_approved'
  | 'application_rejected'
  | 'suspended'
  | 'settlement_completed'

export interface SellerNotification {
  id:         string
  user_id:    string
  type:       NotificationType
  title:      string
  message:    string
  is_read:    boolean
  created_at: string
}

// ================================================================
// 7. UI 상수 (컴포넌트에서 import해서 쓰는 레이블/색상 맵)
// ================================================================

export const PRODUCT_STATUS_META: Record<ProductStatus, { label: string; className: string }> = {
  active:   { label: '판매 중',   className: 'bg-green-100 text-green-700' },
  draft:    { label: '임시저장',  className: 'bg-gray-100 text-gray-600'  },
  sold_out: { label: '품절',      className: 'bg-amber-100 text-amber-700' },
  hidden:   { label: '숨김',      className: 'bg-red-100 text-red-600'    },
}

export const ORDER_ITEM_STATUS_META: Record<OrderItemStatus, { label: string; color: string }> = {
  pending:   { label: '주문 확인 중', color: 'bg-gray-100 text-gray-600'   },
  preparing: { label: '배송 준비 중', color: 'bg-blue-100 text-blue-700'   },
  shipping:  { label: '배송 중',      color: 'bg-amber-100 text-amber-700' },
  delivered: { label: '배송 완료',    color: 'bg-green-100 text-green-700' },
  cancelled: { label: '취소됨',       color: 'bg-red-100 text-red-600'     },
}

export const STORE_CATEGORIES = [
  '패션/의류', '뷰티/화장품', '식품/건강', '전자/가전',
  '생활/인테리어', '스포츠/레저', '도서/문구', '반려동물', '유아/아동', '기타',
] as const

export type StoreCategory = typeof STORE_CATEGORIES[number]

export const CARRIERS = [
  { code: 'kr.cjlogistics', name: 'CJ대한통운' },
  { code: 'kr.lotte',       name: '롯데택배'    },
  { code: 'kr.hanjin',      name: '한진택배'    },
  { code: 'kr.post',        name: '우체국'      },
  { code: 'kr.logen',       name: '로젠택배'    },
] as const

export type CarrierCode = typeof CARRIERS[number]['code']
