export type ProductStatus = 'active' | 'draft' | 'sold_out' | 'hidden'

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
  options:         unknown[]
  variants:        unknown[]
  status:          ProductStatus
}

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
