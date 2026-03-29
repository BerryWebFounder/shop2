export type OrderItemStatus = 'pending' | 'preparing' | 'shipping' | 'delivered' | 'cancelled'
export type SettlementStatus = 'pending' | 'processing' | 'completed' | 'failed'

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
  order?: {
    order_number:  string
    shipping_name: string
    shipping_phone: string
    shipping_addr: string
    created_at:    string
  }
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
  status:         SettlementStatus
  paid_at:        string | null
  admin_note:     string | null
  created_at:     string
  updated_at:     string
}
