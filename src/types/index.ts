// ── Member ────────────────────────────────────────────
export type MemberStatus = 'active' | 'dormant' | 'withdrawn'

export interface Member {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
  status: MemberStatus
  join_date: string
  last_login: string | null
  withdraw_date: string | null
  dormant_date: string | null
  created_at: string
  updated_at: string
}

// 목록/상세 조회 시 반환되는 마스킹 처리된 뷰
export interface MemberSafeView {
  id: string
  name: string        // 휴면/탈퇴 시 마스킹
  email: string       // 휴면/탈퇴 시 마스킹
  phone: string | null
  address: string | null
  status: MemberStatus
  join_date: string
  last_login: string | null
  withdraw_date: string | null
  dormant_date: string | null
}

export interface MemberListItem extends MemberSafeView {
  last_order_no: string | null
  last_order_amount: number | null
  last_order_date: string | null
}

// ── Category ──────────────────────────────────────────
export interface Category {
  id: string
  parent_id: string | null
  name: string
  level: 1 | 2 | 3
  sort_order: number
  description: string | null
  created_at: string
}

export interface CategoryTree extends Category {
  children: CategoryWithChildren[]
}

export interface CategoryWithChildren extends Category {
  children: Category[]
}

// ── Product ───────────────────────────────────────────
export type ProductStatus = 'sale' | 'soldout' | 'stop'

export interface Product {
  id: string
  serial_no: string
  name: string
  summary: string | null
  description: string | null
  cat1_id: string | null
  cat2_id: string | null
  cat3_id: string | null
  price: number
  sale_price: number | null
  stock: number
  status: ProductStatus
  created_at: string
  updated_at: string
  // joined
  cat1?: Category | null
  cat2?: Category | null
  cat3?: Category | null
}

export interface ProductListItem {
  id: string
  serial_no: string
  name: string
  cat1_name: string | null
  cat2_name: string | null
  cat3_name: string | null
  price: number
  sale_price: number | null
  stock: number
  status: ProductStatus
  created_at: string
}

// ── Event ─────────────────────────────────────────────
export type EventStatus = 'active' | 'scheduled' | 'ended'

export interface ShopEvent {
  id: string
  name: string
  description: string | null
  start_date: string
  end_date: string
  status: EventStatus
  created_at: string
  updated_at: string
}

// ── Display ───────────────────────────────────────────
export type DisplayType = 'default' | 'event'

export interface DisplayItem {
  id: string
  product_id: string
  event_id: string | null
  display_type: DisplayType
  start_date: string
  end_date: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  // joined
  product?: ProductListItem
  event?: ShopEvent | null
}

// ── Settings ──────────────────────────────────────────
export interface AdminSettings {
  id: string
  store_name: string
  biz_no: string | null
  address: string | null
  phone: string | null
  email: string | null
  dormant_days: number
  data_keep_years: number
  updated_at: string
}

// ── Dashboard ─────────────────────────────────────────
export interface DashboardStats {
  total_members: number
  new_members_this_month: number
  today_orders: number
  today_revenue: number
  displayed_products: number
  total_products: number
  low_stock_count: number
}

export interface WeeklySales {
  date: string
  revenue: number
  orders: number
}

// ── API Response ──────────────────────────────────────
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

// ── Form types ────────────────────────────────────────
export interface ProductFormData {
  name: string
  summary: string
  description: string
  cat1_id: string
  cat2_id: string
  cat3_id: string
  price: number
  sale_price: number | null
  stock: number
  status: ProductStatus
}

export interface EventFormData {
  name: string
  description: string
  start_date: string
  end_date: string
  status: EventStatus
}

export interface DisplayFormData {
  product_id: string
  event_id: string | null
  display_type: DisplayType
  start_date: string
  end_date: string
  sort_order: number
}

export interface SettingsFormData {
  store_name: string
  biz_no: string
  address: string
  phone: string
  email: string
  dormant_days: number
  data_keep_years: number
}
