// src/app/admin/sellers/types.ts
// 판매자 신청 관련 타입 정의

export type ApplicationStatus = 'pending' | 'approved' | 'rejected'

export interface SellerApplication {
  id:              string
  user_id:         string

  // 사업자 정보
  business_name:   string
  business_type:   'individual' | 'corporation'
  business_number: string | null
  representative:  string
  phone:           string
  email:           string
  address:         string

  // 상점 정보
  store_name:      string
  store_slug:      string
  store_category:  string
  store_intro:     string | null

  // 첨부 서류
  id_document_url: string | null
  biz_doc_url:     string | null

  // 처리 상태
  status:          ApplicationStatus
  admin_note:      string | null
  reviewed_by:     string | null
  reviewed_at:     string | null

  created_at:      string
  updated_at:      string
}

export interface SellerStore {
  id:             string
  owner_id:       string
  store_name:     string
  slug:           string
  tagline:        string | null
  intro:          string | null
  store_category: string
  logo_url:       string | null
  banner_url:     string | null
  theme_color:    string
  shipping_policy: string | null
  return_policy:  string | null
  fee_rate:       number
  contact_email:  string | null
  contact_phone:  string | null
  sns_links:      Record<string, string>
  status:         'active' | 'suspended' | 'closed'
  total_products: number
  total_orders:   number
  total_revenue:  number
  created_at:     string
  updated_at:     string
}

export interface SellerProduct {
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
  status:         'pending' | 'processing' | 'completed' | 'failed'
  paid_at:        string | null
  admin_note:     string | null
  created_at:     string
  updated_at:     string
}
