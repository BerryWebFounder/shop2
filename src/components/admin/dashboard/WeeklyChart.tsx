'use client'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { fmtKRW, fmtKRWFull, tooltipStyle, tooltipLabelStyle, CHART_COLORS, CHART_STYLE } from '@/components/admin/charts/ChartTheme'

interface WeeklyData {
  date:          string
  revenue:       number
  orders:        number
  new_members:   number
  avg_order_amt: number
}

const dayNames = ['일','월','화','수','목','금','토']

export function WeeklyRevenueChart({ data }: { data: WeeklyData[] }) {
  const formatted = data.map(d => ({
    ...d,
    label:   new Date(d.date).getDay() === new Date().getDay()
      ? '오늘' : dayNames[new Date(d.date).getDay()],
    revenue: Number(d.revenue),
    orders:  Number(d.orders),
  }))

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={formatted} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="wRevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
            <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}   />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHART_STYLE.bgGrid} strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fill: '#9ca3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtKRW} tick={{ fill: '#9ca3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          formatter={(v: number) => [fmtKRWFull(v), '매출']}
        />
        <Area
          type="monotone" dataKey="revenue"
          stroke={CHART_COLORS.primary} strokeWidth={2}
          fill="url(#wRevGrad)" dot={{ r: 3, fill: CHART_COLORS.primary }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function WeeklyOrderChart({ data }: { data: WeeklyData[] }) {
  const formatted = data.map(d => ({
    label:  dayNames[new Date(d.date).getDay()],
    orders: Number(d.orders),
    members: Number(d.new_members),
  }))

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={formatted} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART_STYLE.bgGrid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#9ca3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#9ca3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle}
          formatter={(v: number, name: string) => [v + (name === 'orders' ? '건' : '명'), name === 'orders' ? '주문' : '신규회원']} />
        <Bar dataKey="orders"  fill={CHART_COLORS.primary}   radius={[3,3,0,0]} opacity={0.85} />
        <Bar dataKey="members" fill={CHART_COLORS.secondary}  radius={[3,3,0,0]} opacity={0.85} />
      </BarChart>
    </ResponsiveContainer>
  )
}
