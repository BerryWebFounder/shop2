// src/lib/types/v2.ts
// shop2 소호몰 플랫폼 공통 타입 정의
// seller/ 및 admin/sellers/ 하위 모든 페이지에서 사용

// ── 판매자 신청 ────────────────────────────────────────────────
export type ApplicationStatus = 'pending' | 'approved' | 'rejected'

export interface SellerApplication {
  id:              string
  user_id:         string
  business_name:   string
  business_type:   'individual' | 'corporation'
  business_number: string | null
  representative:  string
  phone:           string
  email:           string
  address:         string
  store_name:      string
  store_slug:      string
  store_category:  string
  store_intro:     string | null
  id_document_url: string | null
  biz_doc_url:     string | null
  status:          ApplicationStatus
  admin_note:      string | null
  reviewed_by:     string | null
  reviewed_at:     string | null
  created_at:      string
  updated_at:      string
}

// ── 소호몰 ────────────────────────────────────────────────────
export interface SellerStore {
  id:              string
  owner_id:        string
  store_name:      string
  slug:            string
  tagline:         string | null
  intro:           string | null
  store_category:  string
  logo_url:        string | null
  banner_url:      string | null
  theme_color:     string
  shipping_policy: string | null
  return_policy:   string | null
  fee_rate:        number
  contact_email:   string | null
  contact_phone:   string | null
  sns_links:       Record<string, string>
  status:          'active' | 'suspended' | 'closed'
  total_products:  number
  total_orders:    number
  total_revenue:   number
  created_at:      string
  updated_at:      string
}

// ── 판매자 상품 ───────────────────────────────────────────────
export interface Product {
  id:              string
  store_id:        string
  name:            string
  description:     string | null
  price:           number
  compare_price:   number | null
  cost_price:      number | null
  category:        string | null
  tags:            string[]
  images:          string[]
  track_inventory: boolean
  stock_quantity:  number
  low_stock_alert: number | null
  has_options:     boolean
  options:         unknown[]
  variants:        unknown[]
  meta_title:      string | null
  meta_desc:       string | null
  status:          'active' | 'draft' | 'sold_out' | 'hidden'
  created_at:      string
  updated_at:      string
}

// ── 주문 ──────────────────────────────────────────────────────
export type OrderStatus =
  | 'pending' | 'paid' | 'preparing' | 'shipping'
  | 'delivered' | 'cancelled' | 'refunded'

export type OrderItemStatus =
  | 'pending' | 'preparing' | 'shipping' | 'delivered' | 'cancelled'

export interface SellerOrder {
  id:             string
  order_number:   string
  customer_id:    string | null
  shipping_name:  string
  shipping_phone: string
  shipping_addr:  string
  shipping_detail: string | null
  postal_code:    string | null
  payment_method: string | null
  payment_key:    string | null
  total_amount:   number
  shipping_fee:   number
  status:         OrderStatus
  created_at:     string
  updated_at:     string
}

export interface OrderItem {
  id:               string
  order_id:         string
  store_id:         string
  product_id:       string
  product_name:     string
  product_image:    string | null
  options_snapshot: Record<string, unknown>
  quantity:         number
  unit_price:       number
  total_price:      number
  item_status:      OrderItemStatus
  tracking_number:  string | null
  carrier_code:     string | null
  created_at:       string
  updated_at:       string
  order?:           Pick<SellerOrder, 'order_number' | 'shipping_name' | 'shipping_phone' | 'shipping_addr' | 'created_at'>
}

// ── 정산 ──────────────────────────────────────────────────────
export type SettlementStatus =
  | 'pending' | 'processing' | 'completed' | 'failed'

export interface Settlement {
  id:             string
  store_id:       string
  period_start:   string
  period_end:     string
  gross_amount:   number
  fee_rate:       number
  fee_amount:     number
  net_amount:     number
  bank_name:      string | null
  account_number: string | null
  account_holder: string | null
  status:         SettlementStatus
  paid_at:        string | null
  admin_note:     string | null
  created_at:     string
  updated_at:     string
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
  delivered_at:  string | null
  created_at:    string
}

// ── 알림 ──────────────────────────────────────────────────────
export type NotificationType =
  | 'application_approved' | 'application_rejected'
  | 'suspended' | 'settlement_completed'

export interface SellerNotification {
  id:         string
  user_id:    string
  type:       NotificationType
  title:      string
  message:    string
  is_read:    boolean
  created_at: string
}
