export type DiscountType = 'percent' | 'fixed'
export type CouponComputedStatus = 'active' | 'expired' | 'inactive'
export type PointType = 'earn' | 'use' | 'expire' | 'admin' | 'cancel'

// ── 쿠폰 ─────────────────────────────────────────────────────────
export interface Coupon {
  id:               string
  code:             string
  name:             string
  description:      string | null
  discount_type:    DiscountType
  discount_value:   number
  min_order_amount: number
  max_discount_amt: number | null
  usage_limit:      number | null
  usage_count:      number
  per_user_limit:   number
  valid_from:       string
  valid_until:      string | null
  applicable_cat:   string | null
  is_active:        boolean
  created_at:       string
  updated_at:       string
}

export interface CouponStatsView extends Coupon {
  actual_usage_count:  number
  total_discount_given: number
  computed_status:     CouponComputedStatus
}

// 쿠폰 검증 응답
export interface CouponValidateResult {
  valid:           boolean
  coupon?:         Coupon
  discount_amount: number
  error?:          string
}

// ── 포인트 ───────────────────────────────────────────────────────
export interface MemberPoint {
  id:         string
  member_id:  string
  amount:     number
  type:       PointType
  reason:     string
  order_id:   string | null
  expires_at: string | null
  created_at: string
}

export interface MemberPointBalance {
  member_id:     string
  balance:       number
  total_earned:  number
  total_used:    number
  earn_count:    number
  last_activity: string | null
}

// ── 주문 할인 적용 폼 ─────────────────────────────────────────────
export interface OrderDiscountForm {
  coupon_code?:  string
  coupon_id?:    string
  coupon_discount: number
  point_used:    number
}

// ── 쿠폰 등록 폼 ─────────────────────────────────────────────────
export interface CouponFormData {
  code:             string
  name:             string
  description:      string
  discount_type:    DiscountType
  discount_value:   number
  min_order_amount: number
  max_discount_amt: number | null
  usage_limit:      number | null
  per_user_limit:   number
  valid_from:       string
  valid_until:      string | null
  applicable_cat:   string | null
  is_active:        boolean
}
