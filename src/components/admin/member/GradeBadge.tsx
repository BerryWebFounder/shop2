'use client'
import {
  GRADE_LABEL, GRADE_COLOR, GRADE_BG, GRADE_ICON,
  type MemberGrade,
} from '@/types/member'
import { formatPrice } from '@/lib/utils'

// ── 등급 뱃지 ────────────────────────────────────────────────────
export function GradeBadge({ grade, size = 'sm' }: { grade: MemberGrade; size?: 'xs' | 'sm' | 'md' }) {
  const sizes = { xs: 'text-[10px] px-1.5 py-0.5', sm: 'text-xs px-2 py-0.5', md: 'text-sm px-3 py-1' }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${sizes[size]}`}
      style={{ background: GRADE_BG[grade], color: GRADE_COLOR[grade], border: `1px solid ${GRADE_COLOR[grade]}40` }}
    >
      {GRADE_ICON[grade]} {GRADE_LABEL[grade]}
    </span>
  )
}

// ── 다음 등급까지 프로그레스 바 ───────────────────────────────────
export function GradeProgress({
  grade,
  annualPurchase,
  nextGradeAmount,
}: {
  grade:            MemberGrade
  annualPurchase:   number
  nextGradeAmount:  number | null
}) {
  if (!nextGradeAmount || grade === 'vip') {
    return (
      <div className="flex items-center gap-2">
        <GradeBadge grade={grade} size="sm" />
        <span className="text-xs text-ink-3">최고 등급</span>
      </div>
    )
  }

  const pct   = Math.min(100, (annualPurchase / nextGradeAmount) * 100)
  const remain = nextGradeAmount - annualPurchase

  const NEXT_GRADES: Record<MemberGrade, MemberGrade> = {
    bronze: 'silver', silver: 'gold', gold: 'vip', vip: 'vip',
  }
  const nextGrade = NEXT_GRADES[grade]

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <GradeBadge grade={grade} size="xs" />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-ink-3">→</span>
          <GradeBadge grade={nextGrade} size="xs" />
        </div>
      </div>
      <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-3)' }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: GRADE_COLOR[nextGrade] }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] font-mono text-ink-3">{formatPrice(annualPurchase)}</span>
        <span className="text-[10px] text-ink-3">
          {remain > 0 ? `${formatPrice(remain)} 더 필요` : '달성!'}
        </span>
        <span className="text-[10px] font-mono text-ink-3">{formatPrice(nextGradeAmount)}</span>
      </div>
    </div>
  )
}

// ── 등급 전체 현황 카드 (통계용) ─────────────────────────────────
export function GradeDistributionCard({
  counts,
}: {
  counts: Partial<Record<MemberGrade, number>>
}) {
  const grades: MemberGrade[] = ['bronze', 'silver', 'gold', 'vip']
  const total = grades.reduce((s, g) => s + (counts[g] ?? 0), 0)

  return (
    <div className="grid grid-cols-4 gap-2">
      {grades.map(grade => {
        const count = counts[grade] ?? 0
        const pct   = total > 0 ? ((count / total) * 100).toFixed(0) : '0'
        return (
          <div
            key={grade}
            className="rounded-xl p-3 text-center"
            style={{ background: GRADE_BG[grade], border: `1.5px solid ${GRADE_COLOR[grade]}30` }}
          >
            <div className="text-xl mb-1">{GRADE_ICON[grade]}</div>
            <div className="text-xs font-semibold" style={{ color: GRADE_COLOR[grade] }}>
              {GRADE_LABEL[grade]}
            </div>
            <div className="text-lg font-bold text-ink mt-0.5">{count.toLocaleString()}</div>
            <div className="text-[10px] text-ink-3">{pct}%</div>
          </div>
        )
      })}
    </div>
  )
}
