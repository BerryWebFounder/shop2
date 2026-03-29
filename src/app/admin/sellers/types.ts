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
