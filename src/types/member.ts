export type MemberStatus = 'active' | 'dormant' | 'withdrawn'
export type MemberGrade  = 'bronze' | 'silver' | 'gold' | 'vip'

export const GRADE_LABEL: Record<MemberGrade, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold:   'Gold',
  vip:    'VIP',
}

export const GRADE_COLOR: Record<MemberGrade, string> = {
  bronze: '#cd7f32',
  silver: '#a8a8a8',
  gold:   '#f5b800',
  vip:    '#b44fde',
}

export const GRADE_BG: Record<MemberGrade, string> = {
  bronze: 'rgba(205,127,50,0.12)',
  silver: 'rgba(168,168,168,0.12)',
  gold:   'rgba(245,184,0,0.12)',
  vip:    'rgba(180,79,222,0.12)',
}

export const GRADE_ICON: Record<MemberGrade, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold:   '🥇',
  vip:    '💎',
}

export interface MemberGradeConfig {
  grade:             MemberGrade
  label:             string
  min_annual_amount: number
  point_rate:        number
  discount_rate:     number
  badge_color:       string
  description:       string | null
  sort_order:        number
}

export interface MemberGradeHistory {
  id:            string
  member_id:     string
  from_grade:    MemberGrade | null
  to_grade:      MemberGrade
  reason:        string
  annual_amount: number | null
  created_at:    string
}

export interface Member {
  id:               string
  name:             string
  email:            string
  phone:            string | null
  status:           MemberStatus
  grade:            MemberGrade
  grade_updated_at: string | null
  total_purchase:   number
  annual_purchase:  number
  order_count:      number
  notes:            string | null
  join_date:        string
  last_login:       string | null
}

export interface MemberStatsView extends Member {
  grade_label:       string
  grade_color:       string
  point_rate:        number
  discount_rate:     number
  next_grade_amount: number | null
  point_balance:     number
}
