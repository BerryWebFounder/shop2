export type InquiryCategory =
  | 'order' | 'shipping' | 'return' | 'product'
  | 'account' | 'coupon' | 'other'

export type InquiryStatus =
  | 'pending' | 'in_progress' | 'answered' | 'closed'

export const INQUIRY_CATEGORY_LABEL: Record<InquiryCategory, string> = {
  order:    '주문/결제',
  shipping: '배송',
  return:   '교환/반품',
  product:  '상품 문의',
  account:  '계정/회원',
  coupon:   '쿠폰/포인트',
  other:    '기타',
}

export const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  pending:     '접수 대기',
  in_progress: '처리 중',
  answered:    '답변 완료',
  closed:      '종결',
}

export const INQUIRY_STATUS_VARIANT: Record<InquiryStatus, 'yellow' | 'blue' | 'green' | 'gray'> = {
  pending:     'yellow',
  in_progress: 'blue',
  answered:    'green',
  closed:      'gray',
}

// ── 문의 ─────────────────────────────────────────────────────────
export interface Inquiry {
  id:               string
  member_id:        string | null
  order_id:         string | null
  author_name:      string
  author_email:     string
  category:         InquiryCategory
  title:            string
  body:             string
  status:           InquiryStatus
  is_private:       boolean
  admin_reply:      string | null
  admin_replied_at: string | null
  admin_id:         string | null
  attachments:      string[]
  created_at:       string
  updated_at:       string
}

export interface InquiryReply {
  id:          string
  inquiry_id:  string
  is_admin:    boolean
  author_name: string
  body:        string
  attachments: string[]
  created_at:  string
}

export interface InquiryWithReplies extends Inquiry {
  replies:      InquiryReply[]
  order_no?:    string | null
  member_name?: string | null
}

// ── FAQ ──────────────────────────────────────────────────────────
export interface FAQ {
  id:         string
  category:   InquiryCategory
  question:   string
  answer:     string
  sort_order: number
  is_active:  boolean
  view_count: number
  created_at: string
  updated_at: string
}

// ── 폼 ──────────────────────────────────────────────────────────
export interface InquiryFormData {
  category:     InquiryCategory
  title:        string
  body:         string
  order_id?:    string | null
  author_name:  string
  author_email: string
  attachments:  string[]
}

export interface InquiryStats {
  total:               number
  pending:             number
  in_progress:         number
  answered:            number
  closed:              number
  avg_response_hours:  number | null
}
