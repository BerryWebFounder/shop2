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

export interface StoreUpdateData {
  store_name?:      string
  tagline?:         string
  intro?:           string
  store_category?:  string
  logo_url?:        string
  banner_url?:      string
  theme_color?:     string
  shipping_policy?: string
  return_policy?:   string
  contact_email?:   string
  contact_phone?:   string
  sns_links?:       Record<string, string>
}
