export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export interface ProductReview {
  id:               string
  product_id:       string
  member_id:        string | null
  order_id:         string | null
  reviewer_name:    string
  reviewer_email:   string | null
  rating:           number   // 1–5
  title:            string
  body:             string
  status:           ReviewStatus
  reject_reason:    string | null
  helpful_count:    number
  admin_reply:      string | null
  admin_replied_at: string | null
  created_at:       string
  updated_at:       string
}

export interface ReviewAdminView extends ProductReview {
  product_name:   string
  product_serial: string
}

export interface ProductRatingSummary {
  product_id:   string
  review_count: number
  avg_rating:   number | null
  star5: number
  star4: number
  star3: number
  star2: number
  star1: number
}

export interface ReviewFormData {
  product_id:     string
  order_id?:      string | null
  reviewer_name:  string
  reviewer_email: string
  rating:         number
  title:          string
  body:           string
}

export interface ReviewStatsData {
  total:      number
  pending:    number
  approved:   number
  rejected:   number
  avg_rating: number | null
}
