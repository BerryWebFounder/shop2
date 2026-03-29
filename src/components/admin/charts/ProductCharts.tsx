'use client'
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  CHART_COLORS, CHART_STYLE, PALETTE,
  tooltipStyle, tooltipLabelStyle, axisStyle, fmtKRW, fmtKRWFull,
} from './ChartTheme'
import { Card, CardTitle } from '@/components/ui/Card'

// ── 재고 현황 도넛 ────────────────────────────────────────────────
const STOCK_COLORS: Record<string, string> = {
  '품절':          CHART_COLORS.danger,
  '재고부족(5개↓)': CHART_COLORS.accent,
  '주의(20개↓)':   CHART_COLORS.purple,
  '정상':          CHART_COLORS.secondary,
}

export function StockStatusChart({ data }: {
  data: Array<{ category: string; count: number }>
}) {
  const formatted = data.map(d => ({
    name:  d.category,
    value: Number(d.count),
    color: STOCK_COLORS[d.category] ?? CHART_COLORS.primary,
  }))
  const total = formatted.reduce((s, d) => s + d.value, 0)

  return (
    <Card>
      <CardTitle>📦 재고 현황</CardTitle>
      <div className="flex items-center gap-6">
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie data={formatted} cx="50%" cy="50%" innerRadius={38} outerRadius={62}
              dataKey="value" labelLine={false}>
              {formatted.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle}
              formatter={(v: number) => [v.toLocaleString() + '개', '상품']} />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-2 flex-1">
          {formatted.map(d => (
            <div key={d.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                <span className="text-xs text-ink-2">{d.name}</span>
              </div>
              <span className="text-sm font-semibold font-mono text-ink">
                {d.value.toLocaleString()}
              </span>
            </div>
          ))}
          <div className="pt-2 border-t border-border flex justify-between">
            <span className="text-xs text-ink-3">전체</span>
            <span className="text-sm font-bold font-mono text-ink">{total.toLocaleString()}개</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

// ── 인기 상품 Top 10 수평 바 ─────────────────────────────────────
export function TopProductsChart({ data }: {
  data: Array<{ product_name: string; revenue: number; qty_sold: number }>
}) {
  const formatted = data
    .slice(0, 10)
    .map(d => ({
      name:    d.product_name.length > 16 ? d.product_name.slice(0, 16) + '…' : d.product_name,
      revenue: Number(d.revenue),
      qty:     Number(d.qty_sold),
    }))
    .reverse()   // 수평 바에서 상위가 위에 오도록

  return (
    <Card>
      <CardTitle>🏆 인기 상품 Top 10</CardTitle>
      <ResponsiveContainer width="100%" height={Math.max(180, formatted.length * 32)}>
        <BarChart
          data={formatted} layout="vertical"
          margin={{ top: 4, right: 56, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke={CHART_STYLE.bgGrid} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={fmtKRW} {...axisStyle} />
          <YAxis type="category" dataKey="name" {...axisStyle} width={120} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={tooltipLabelStyle}
            formatter={(v: number, name: string) =>
              name === 'revenue' ? [fmtKRWFull(v), '매출'] : [v.toLocaleString() + '개', '판매량']
            }
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

// ── 주문 상태 분포 파이 ───────────────────────────────────────────
const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: '결제대기', paid: '결제완료', shipping: '배송중',
  delivered: '배송완료', returned: '반품', cancelled: '취소',
}
const ORDER_STATUS_COLOR: Record<string, string> = {
  pending:   CHART_COLORS.accent,
  paid:      CHART_COLORS.primary,
  shipping:  CHART_COLORS.teal,
  delivered: CHART_COLORS.secondary,
  returned:  CHART_COLORS.coral,
  cancelled: '#6b7280',
}

export function OrderStatusPieChart({ data }: {
  data: Array<{ status: string; count: number; revenue: number }>
}) {
  const formatted = data.map(d => ({
    name:    ORDER_STATUS_LABEL[d.status] ?? d.status,
    value:   Number(d.count),
    revenue: Number(d.revenue),
    color:   ORDER_STATUS_COLOR[d.status] ?? CHART_COLORS.primary,
  }))

  return (
    <Card>
      <CardTitle>🛒 주문 상태 분포</CardTitle>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie data={formatted} cx="50%" cy="50%" outerRadius={62}
              dataKey="value" labelLine={false}>
              {formatted.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle}
              formatter={(v: number) => [v.toLocaleString() + '건', '주문']} />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-1.5 flex-1 min-w-0">
          {formatted.map(d => (
            <div key={d.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                <span className="text-xs text-ink-2 truncate">{d.name}</span>
              </div>
              <span className="text-xs font-mono font-semibold text-ink flex-shrink-0">
                {d.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
