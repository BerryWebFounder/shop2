'use client'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import {
  CHART_COLORS, CHART_STYLE, PALETTE,
  tooltipStyle, tooltipLabelStyle, axisStyle,
  fmtKRW, fmtKRWFull,
} from './ChartTheme'
import { Card, CardTitle } from '@/components/ui/Card'

// ── 일별 매출 면적 차트 ──────────────────────────────────────────
export function DailyRevenueChart({ data }: {
  data: Array<{ date: string; revenue: number; order_count: number }>
}) {
  const formatted = data.map(d => ({
    ...d,
    label:   d.date.slice(5),   // MM-DD
    revenue: Number(d.revenue),
    orders:  Number(d.order_count),
  }))
  const avg = formatted.length
    ? Math.round(formatted.reduce((s, d) => s + d.revenue, 0) / formatted.length)
    : 0

  return (
    <Card>
      <CardTitle>📈 일별 매출</CardTitle>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={formatted} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART_STYLE.bgGrid} strokeDasharray="3 3" />
          <XAxis dataKey="label" {...axisStyle} interval="preserveStartEnd" />
          <YAxis tickFormatter={fmtKRW} {...axisStyle} width={48} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={tooltipLabelStyle}
            formatter={(v: number) => [fmtKRWFull(v), '매출']}
          />
          {avg > 0 && (
            <ReferenceLine
              y={avg}
              stroke={CHART_COLORS.accent}
              strokeDasharray="4 3"
              label={{ value: `평균 ${fmtKRW(avg)}`, fill: CHART_COLORS.accent, fontSize: 10, position: 'right' }}
            />
          )}
          <Area
            type="monotone" dataKey="revenue"
            stroke={CHART_COLORS.primary} strokeWidth={2}
            fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ── 월별 매출 + 주문 복합 차트 ────────────────────────────────────
export function MonthlyRevenueChart({ data }: {
  data: Array<{ month: string; revenue: number; order_count: number; new_members: number }>
}) {
  const formatted = data.map(d => ({
    ...d,
    revenue:     Number(d.revenue),
    order_count: Number(d.order_count),
    new_members: Number(d.new_members),
  }))

  return (
    <Card>
      <CardTitle>📅 월별 매출 추이 (12개월)</CardTitle>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={formatted} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART_STYLE.bgGrid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" {...axisStyle} tickFormatter={v => v.slice(5)} />
          <YAxis yAxisId="revenue" tickFormatter={fmtKRW} {...axisStyle} width={48} />
          <YAxis yAxisId="orders" orientation="right" {...axisStyle} width={32} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={tooltipLabelStyle}
            formatter={(v: number, name: string) =>
              name === 'revenue' ? [fmtKRWFull(v), '매출'] : [v.toLocaleString() + '건', '주문']
            }
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: '#9ca3b8' }}
            formatter={v => v === 'revenue' ? '매출' : '주문'}
          />
          <Bar yAxisId="revenue" dataKey="revenue" fill={CHART_COLORS.primary} radius={[3, 3, 0, 0]} opacity={0.85} />
          <Line yAxisId="orders" type="monotone" dataKey="order_count"
            stroke={CHART_COLORS.secondary} strokeWidth={2} dot={{ r: 3 }} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ── 요일별 매출 패턴 ─────────────────────────────────────────────
export function WeekdayRevenueChart({ data }: {
  data: Array<{ weekday: number; weekday_name: string; revenue: number; order_count: number }>
}) {
  const all = ['일','월','화','수','목','금','토']
  const filled = all.map((name, i) => {
    const found = data.find(d => d.weekday === i)
    return { weekday_name: name, revenue: Number(found?.revenue ?? 0), orders: Number(found?.order_count ?? 0) }
  })
  const maxRev = Math.max(...filled.map(d => d.revenue), 1)

  return (
    <Card>
      <CardTitle>📊 요일별 매출 패턴</CardTitle>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={filled} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART_STYLE.bgGrid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="weekday_name" {...axisStyle} />
          <YAxis tickFormatter={fmtKRW} {...axisStyle} width={48} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={tooltipLabelStyle}
            formatter={(v: number) => [fmtKRWFull(v), '매출']}
          />
          <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
            {filled.map((entry, idx) => (
              <rect
                key={idx}
                fill={entry.revenue === maxRev ? CHART_COLORS.accent : CHART_COLORS.primary}
                fillOpacity={entry.revenue === maxRev ? 1 : 0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ── 시간대별 주문 히트맵 스타일 바 ───────────────────────────────
export function HourlyOrderChart({ data }: {
  data: Array<{ hour: number; order_count: number; revenue: number }>
}) {
  const filled = Array.from({ length: 24 }, (_, h) => {
    const found = data.find(d => d.hour === h)
    return { hour: h, orders: Number(found?.order_count ?? 0), revenue: Number(found?.revenue ?? 0) }
  })

  return (
    <Card>
      <CardTitle>⏰ 시간대별 주문 현황</CardTitle>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={filled} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART_STYLE.bgGrid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="hour" {...axisStyle} tickFormatter={v => `${v}시`} interval={3} />
          <YAxis {...axisStyle} width={28} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={tooltipLabelStyle}
            labelFormatter={v => `${v}시`}
            formatter={(v: number) => [v + '건', '주문']}
          />
          <Bar dataKey="orders" fill={CHART_COLORS.teal} radius={[2, 2, 0, 0]} opacity={0.8} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ── 카테고리별 매출 수평 바 ──────────────────────────────────────
export function CategoryRevenueChart({ data }: {
  data: Array<{ cat_name: string; revenue: number; qty_sold: number }>
}) {
  const formatted = data.map(d => ({ ...d, revenue: Number(d.revenue), qty_sold: Number(d.qty_sold) }))

  return (
    <Card>
      <CardTitle>🗂️ 카테고리별 매출</CardTitle>
      <ResponsiveContainer width="100%" height={Math.max(160, formatted.length * 36)}>
        <BarChart
          data={formatted} layout="vertical"
          margin={{ top: 4, right: 56, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke={CHART_STYLE.bgGrid} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={fmtKRW} {...axisStyle} />
          <YAxis type="category" dataKey="cat_name" {...axisStyle} width={72} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={tooltipLabelStyle}
            formatter={(v: number) => [fmtKRWFull(v), '매출']}
          />
          <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
            {formatted.map((_, idx) => (
              <rect key={idx} fill={PALETTE[idx % PALETTE.length]} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
