// ============================================================
// Shop V2 | 전체 TypeScript 타입 정의
// ============================================================

// ── 사용자 역할 ──────────────────────────────────────────────
export type UserRole = 'customer' | 'seller' | 'admin'
export type SellerStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

export interface Profile {
  id: string
  email: string
  name: string
  phone?: string
  role: UserRole
  seller_status: SellerStatus | null
  avatar_url?: string
  created_at: string
  updated_at: string
}

// ── 판매자 신청 ──────────────────────────────────────────────
export type BusinessType = 'individual' | 'corporation'
export type ApplicationStatus = 'pending' | 'approved' | 'rejected'

export interface SellerApplication {
  id: string
  user_id: string
  business_name: string
  business_type: BusinessType
  business_number?: string
  representative: string
  phone: string
  email: string
  address: string
  store_name: string
  store_slug: string
  store_category: string
  store_intro?: string
  id_document_url?: string
  biz_doc_url?: string
  status: ApplicationStatus
  admin_note?: string
  reviewed_by?: string
  reviewed_at?: string
  created_at: string
  updated_at: string
}

export interface SellerApplicationFormData {
  business_name: string
  business_type: BusinessType
  business_number?: string
  representative: string
  phone: string
  email: string
  address: string
  store_name: string
  store_slug: string
  store_category: string
  store_intro?: string
}

// ── 소호몰 ──────────────────────────────────────────────────
export type StoreStatus = 'active' | 'suspended' | 'closed'

export interface SellerStore {
  id: string
  owner_id: string
  store_name: string
  slug: string
  tagline?: string
  intro?: string
  store_category: string
  logo_url?: string
  banner_url?: string
  theme_color: string
  shipping_policy?: string
  return_policy?: string
  fee_rate: number
  contact_email?: string
  contact_phone?: string
  sns_links: Record<string, string>
  status: StoreStatus
  total_products: number
  total_orders: number
  total_revenue: number
  created_at: string
  updated_at: string
}

export interface StoreUpdateData {
  store_name?: string
  tagline?: string
  intro?: string
  logo_url?: string
  banner_url?: string
  theme_color?: string
  shipping_policy?: string
  return_policy?: string
  contact_email?: string
  contact_phone?: string
  sns_links?: Record<string, string>
}

// ── 상품 ─────────────────────────────────────────────────────
export type ProductStatus = 'active' | 'draft' | 'sold_out' | 'hidden'

export interface ProductOption {
  name: string
  values: string[]
}

export interface ProductVariant {
  sku: string
  price: number
  stock: number
  options: Record<string, string>
  image_url?: string
}

export interface Product {
  id: string
  store_id: string
  name: string
  description?: string
  price: number
  compare_price?: number
  cost_price?: number
  category?: string
  tags: string[]
  images: string[]
  track_inventory: boolean
  stock_quantity: number
  low_stock_alert: number
  has_options: boolean
  options: ProductOption[]
  variants: ProductVariant[]
  meta_title?: string
  meta_desc?: string
  status: ProductStatus
  created_at: string
  updated_at: string
  // JOIN
  store?: Pick<SellerStore, 'store_name' | 'slug' | 'logo_url'>
}

export interface ProductFormData {
  name: string
  description?: string
  price: number
  compare_price?: number
  cost_price?: number
  category?: string
  tags: string[]
  images: string[]
  track_inventory: boolean
  stock_quantity: number
  low_stock_alert: number
  has_options: boolean
  options: ProductOption[]
  variants: ProductVariant[]
  status: ProductStatus
}

// ── 주문 ─────────────────────────────────────────────────────
export type OrderStatus = 'pending' | 'paid' | 'preparing' | 'shipping' | 'delivered' | 'cancelled' | 'refunded'
export type OrderItemStatus = 'pending' | 'preparing' | 'shipping' | 'delivered' | 'cancelled'

export interface Order {
  id: string
  order_number: string
  customer_id?: string
  shipping_name: string
  shipping_phone: string
  shipping_addr: string
  shipping_detail?: string
  postal_code?: string
  payment_method?: string
  payment_key?: string
  total_amount: number
  shipping_fee: number
  status: OrderStatus
  created_at: string
  updated_at: string
  // JOIN
  items?: OrderItem[]
  customer?: Pick<Profile, 'id' | 'name' | 'email'>
}

export interface OrderItem {
  id: string
  order_id: string
  store_id: string
  product_id: string
  product_name: string
  product_image?: string
  options_snapshot: Record<string, string>
  quantity: number
  unit_price: number
  total_price: number
  item_status: OrderItemStatus
  tracking_number?: string
  carrier_code?: string
  created_at: string
  updated_at: string
  // JOIN
  store?: Pick<SellerStore, 'store_name' | 'slug'>
}

// ── 정산 ─────────────────────────────────────────────────────
export type SettlementStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Settlement {
  id: string
  store_id: string
  period_start: string
  period_end: string
  gross_amount: number
  fee_rate: number
  fee_amount: number
  net_amount: number
  bank_name?: string
  account_number?: string
  account_holder?: string
  status: SettlementStatus
  paid_at?: string
  admin_note?: string
  created_at: string
  updated_at: string
  // JOIN
  store?: Pick<SellerStore, 'store_name' | 'slug' | 'owner_id'>
  items?: SettlementItem[]
}

export interface SettlementItem {
  id: string
  settlement_id: string
  order_item_id: string
  order_number: string
  product_name: string
  quantity: number
  gross_amount: number
  fee_amount: number
  net_amount: number
  delivered_at?: string
  created_at: string
}

// ── 알림 ─────────────────────────────────────────────────────
export type NotificationType = 'application_approved' | 'application_rejected' | 'suspended' | 'settlement_completed'

export interface SellerNotification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  is_read: boolean
  created_at: string
}

// ── API 응답 공통 ─────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}
