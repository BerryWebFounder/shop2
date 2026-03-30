'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar }       from '@/components/layout/Topbar'
import { PageHeader, StatCard } from '@/components/ui/Card'
import { Button }       from '@/components/ui/Button'
import {
  DailyRevenueChart, MonthlyRevenueChart,
  WeekdayRevenueChart, HourlyOrderChart, CategoryRevenueChart,
} from '@/components/admin/charts/RevenueCharts'
import {
  MemberGrowthChart, MemberStatusPieChart,
} from '@/components/admin/charts/MemberCharts'
import {
  StockStatusChart, TopProductsChart, OrderStatusPieChart,
} from '@/components/admin/charts/ProductCharts'
import { fmtKRWFull } from '@/components/admin/charts/ChartTheme'

const PERIODS = [
  { label: '7일',  value: '7'   },
  { label: '30일', value: '30'  },
  { label: '90일', value: '90'  },
  { label: '1년',  value: '365' },
]

type Tab = 'revenue' | 'members' | 'products'

interface AnalyticsData {
  summary?:          { total_revenue: number; total_orders: number; avg_daily_revenue: number }
  dailyRevenue?:     unknown[]
  monthlyRevenue?:   unknown[]
  byWeekday?:        unknown[]
  byHour?:           unknown[]
  byCategory?:       unknown[]
  orderStatusDist?:  unknown[]
  memberGrowth?:     unknown[]
  memberStatusDist?: unknown[]
  stockStatus?:      unknown[]
  topProducts?:      unknown[]
}

export default function AnalyticsPage() {
  const [period, setPeriod]   = useState('30')
  const [tab, setTab]         = useState<Tab>('revenue')
  const [data, setData]       = useState<AnalyticsData>({})
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/analytics?period=${period}&section=${tab}`)
      const json = await res.json()
      setData(prev => ({ ...prev, ...json.data }))
    } finally { setLoading(false) }
  }, [period, tab])

  useEffect(() => { fetchData() }, [fetchData])

  const TAB_LABELS: Record<Tab, string> = {
    revenue:  '매출 분석',
    members:  '회원 분석',
    products: '상품/재고',
  }

  return (
    <>
      <Topbar title="분석 대시보드" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 animate-page">

        {/* 헤더: 기간 + 탭 */}
        <PageHeader title="분석 대시보드" subtitle="데이터 기반 인사이트">
          <div className="flex items-center gap-1 bg-bg-3 rounded-lg p-1">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  period === p.value
                    ? 'bg-bg-2 text-ink shadow-sm'
                    : 'text-ink-3 hover:text-ink-2'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button
            size="sm" variant="secondary"
            loading={loading}
            onClick={fetchData}
          >
            ↻ 새로고침
          </Button>
        </PageHeader>

        {/* 탭 */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {(Object.entries(TAB_LABELS) as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === key
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-3 hover:text-ink-2'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── 매출 분석 탭 ── */}
        {tab === 'revenue' && (
          <div className="space-y-4">
            {/* 요약 카드 */}
            {data.summary && (
              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  label="기간 총 매출"
                  value={fmtKRWFull(data.summary.total_revenue)}
                  icon="💰"
                />
                <StatCard
                  label="기간 총 주문"
                  value={data.summary.total_orders.toLocaleString() + '건'}
                  icon="🛒"
                />
                <StatCard
                  label="일 평균 매출"
                  value={fmtKRWFull(data.summary.avg_daily_revenue)}
                  icon="📊"
                />
              </div>
            )}

            {/* 차트 그리드 */}
            {loading ? <ChartSkeleton rows={4} /> : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <DailyRevenueChart    data={(data.dailyRevenue    as never[]) ?? []} />
                  <MonthlyRevenueChart  data={(data.monthlyRevenue  as never[]) ?? []} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <WeekdayRevenueChart  data={(data.byWeekday       as never[]) ?? []} />
                  <HourlyOrderChart     data={(data.byHour          as never[]) ?? []} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <CategoryRevenueChart data={(data.byCategory      as never[]) ?? []} />
                  <OrderStatusPieChart  data={(data.orderStatusDist as never[]) ?? []} />
                </div>
              </>
            )}
          </div>
        )}

        {/* ── 회원 분석 탭 ── */}
        {tab === 'members' && (
          <div className="space-y-4">
            {loading ? <ChartSkeleton rows={2} /> : (
              <>
                <MemberGrowthChart    data={(data.memberGrowth     as never[]) ?? []} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <MemberStatusPieChart data={(data.memberStatusDist as never[]) ?? []} />
                  {/* 추가 회원 차트를 여기에 배치 가능 */}
                  <div className="bg-bg-2 border border-border rounded-xl p-5 flex items-center justify-center">
                    <p className="text-sm text-ink-3">추가 회원 분석 차트 (확장 가능)</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── 상품/재고 탭 ── */}
        {tab === 'products' && (
          <div className="space-y-4">
            {loading ? <ChartSkeleton rows={2} /> : (
              <>
                <TopProductsChart data={(data.topProducts as never[]) ?? []} />
                <StockStatusChart  data={(data.stockStatus  as never[]) ?? []} />
              </>
            )}
          </div>
        )}

      </div>
    </>
  )
}

// 로딩 스켈레톤
function ChartSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-bg-2 border border-border rounded-xl p-5 animate-pulse">
          <div className="h-4 w-32 bg-bg-3 rounded mb-4" />
          <div className="h-48 bg-bg-3 rounded-lg" />
        </div>
      ))}
    </div>
  )
}
