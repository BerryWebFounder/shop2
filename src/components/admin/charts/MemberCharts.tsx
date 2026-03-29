'use client'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  CHART_COLORS, CHART_STYLE, PALETTE,
  tooltipStyle, tooltipLabelStyle, axisStyle,
} from './ChartTheme'
import { Card, CardTitle } from '@/components/ui/Card'

// ── 회원 성장 추이 ───────────────────────────────────────────────
export function MemberGrowthChart({ data }: {
  data: Array<{ date: string; new_members: number; total_members: number }>
}) {
  const formatted = data.map(d => ({
    label:         d.date.slice(5),
    신규:          Number(d.new_members),
    누적:          Number(d.total_members),
  }))

  return (
    <Card>
      <CardTitle>👥 회원 성장 추이</CardTitle>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={formatted} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={CHART_COLORS.primary}   stopOpacity={0.25} />
              <stop offset="95%" stopColor={CHART_COLORS.primary}   stopOpacity={0}    />
            </linearGradient>
            <linearGradient id="newGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={CHART_COLORS.secondary} stopOpacity={0.35} />
              <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART_STYLE.bgGrid} strokeDasharray="3 3" />
          <XAxis dataKey="label" {...axisStyle} interval="preserveStartEnd" />
          <YAxis {...axisStyle} width={40} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3b8' }} />
          <Area type="monotone" dataKey="누적" stroke={CHART_COLORS.primary}
            fill="url(#totalGrad)" strokeWidth={2} dot={false} />
          <Area type="monotone" dataKey="신규" stroke={CHART_COLORS.secondary}
            fill="url(#newGrad)" strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ── 회원 상태 도넛 차트 ──────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  active: '활성', dormant: '휴면', withdrawn: '탈퇴',
}
const STATUS_COLOR: Record<string, string> = {
  active:    CHART_COLORS.secondary,
  dormant:   CHART_COLORS.accent,
  withdrawn: CHART_COLORS.danger,
}

export function MemberStatusPieChart({ data }: {
  data: Array<{ status: string; count: number }>
}) {
  const formatted = data.map(d => ({
    name:  STATUS_LABEL[d.status] ?? d.status,
    value: Number(d.count),
    color: STATUS_COLOR[d.status] ?? CHART_COLORS.primary,
  }))
  const total = formatted.reduce((s, d) => s + d.value, 0)

  const RADIAN = Math.PI / 180
  function renderLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
    cx: number; cy: number; midAngle: number
    innerRadius: number; outerRadius: number; percent: number
  }) {
    if (percent < 0.05) return null
    const r = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + r * Math.cos(-midAngle * RADIAN)
    const y = cy + r * Math.sin(-midAngle * RADIAN)
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <Card>
      <CardTitle>🎯 회원 상태 분포</CardTitle>
      <div className="flex items-center gap-6">
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie
              data={formatted} cx="50%" cy="50%"
              innerRadius={45} outerRadius={72}
              dataKey="value" labelLine={false}
              label={renderLabel}
            >
              {formatted.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number, name: string) => [
                `${v.toLocaleString()}명 (${total > 0 ? ((v / total) * 100).toFixed(1) : 0}%)`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="space-y-2.5 flex-1">
          {formatted.map(d => (
            <div key={d.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                <span className="text-xs text-ink-2">{d.name}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold font-mono text-ink">{d.value.toLocaleString()}</span>
                <span className="text-[11px] text-ink-3 ml-1">
                  ({total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%)
                </span>
              </div>
            </div>
          ))}
          <div className="pt-2 border-t border-border flex justify-between">
            <span className="text-xs text-ink-3">전체</span>
            <span className="text-sm font-bold font-mono text-ink">{total.toLocaleString()}명</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
