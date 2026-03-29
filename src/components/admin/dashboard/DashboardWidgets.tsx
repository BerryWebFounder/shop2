'use client'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { ORDER_STATUS_LABEL, ORDER_STATUS_VARIANT } from '@/types/order'
import { GRADE_ICON, GRADE_LABEL, GRADE_COLOR, GRADE_BG } from '@/types/member'
import { formatPrice, formatDateTime } from '@/lib/utils'
import type { OrderStatus } from '@/types/order'
import type { MemberGrade } from '@/types/member'

// ── 최근 주문 위젯 ────────────────────────────────────────────────
interface RecentOrder {
  id: string; order_no: string; status: string
  total_amount: number; member_name: string | null; created_at: string
}

export function RecentOrdersWidget({ orders }: { orders: RecentOrder[] }) {
  return (
    <div className="space-y-px">
      {orders.length === 0 ? (
        <div className="text-center py-8 text-ink-3 text-sm">주문 없음</div>
      ) : orders.map(order => (
        <Link key={order.id} href={`/admin/orders/${order.id}`}
          className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-3 transition-colors rounded-lg -mx-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-accent">{order.order_no}</span>
              <Badge variant={ORDER_STATUS_VARIANT[order.status as OrderStatus] ?? 'gray'}>
                {ORDER_STATUS_LABEL[order.status as OrderStatus] ?? order.status}
              </Badge>
            </div>
            <div className="text-[11px] text-ink-3 mt-0.5">
              {order.member_name ?? '비회원'} · {formatDateTime(order.created_at)}
            </div>
          </div>
          <span className="font-mono text-sm font-semibold text-ink flex-shrink-0">
            {formatPrice(order.total_amount)}
          </span>
        </Link>
      ))}
    </div>
  )
}

// ── 재고 부족 위젯 ────────────────────────────────────────────────
interface LowStockItem {
  id: string; name: string; stock: number; status: string; cat_name: string | null
}

export function LowStockWidget({ items }: { items: LowStockItem[] }) {
  return (
    <div className="space-y-px">
      {items.length === 0 ? (
        <div className="text-center py-8 text-green-400 text-sm">✅ 재고 이상 없음</div>
      ) : items.map(item => (
        <Link key={item.id} href="/admin/products"
          className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-3 transition-colors rounded-lg -mx-1">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink line-clamp-1">{item.name}</p>
            {item.cat_name && (
              <p className="text-[11px] text-ink-3">{item.cat_name}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span
              className={`font-mono text-sm font-bold ${item.stock === 0 ? 'text-red-400' : item.stock <= 3 ? 'text-red-300' : 'text-yellow-400'}`}
            >
              {item.stock}개
            </span>
            {item.stock === 0 && (
              <span className="text-[10px] font-bold bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-full">
                품절
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}

// ── 인기 상품 위젯 ────────────────────────────────────────────────
interface TopProduct {
  product_id: string; product_name: string; qty_sold: number; revenue: number
}

export function TopProductsWidget({ products }: { products: TopProduct[] }) {
  if (products.length === 0) return (
    <div className="text-center py-8 text-ink-3 text-sm">오늘 판매 없음</div>
  )

  const maxRevenue = Math.max(...products.map(p => Number(p.revenue)), 1)

  return (
    <div className="space-y-3">
      {products.map((p, idx) => {
        const pct = (Number(p.revenue) / maxRevenue) * 100
        return (
          <div key={p.product_id}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-ink-3 font-mono w-4 flex-shrink-0">#{idx + 1}</span>
                <span className="text-sm text-ink line-clamp-1">{p.product_name}</span>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <span className="text-sm font-semibold font-mono text-ink">{formatPrice(Number(p.revenue))}</span>
                <span className="text-[11px] text-ink-3 ml-1.5">{Number(p.qty_sold)}개</span>
              </div>
            </div>
            <div className="h-1 rounded-full bg-bg-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: 'var(--accent)' }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── 회원 등급 분포 위젯 ────────────────────────────────────────────
interface GradeDist { grade: string; count: number }

export function MemberGradeWidget({ distribution }: { distribution: GradeDist[] }) {
  const total = distribution.reduce((s, d) => s + Number(d.count), 0)

  if (total === 0) return (
    <div className="text-center py-8 text-ink-3 text-sm">회원 없음</div>
  )

  return (
    <div className="space-y-3">
      {distribution.map(item => {
        const grade  = item.grade as MemberGrade
        const count  = Number(item.count)
        const pct    = total > 0 ? ((count / total) * 100).toFixed(1) : '0'
        const barPct = total > 0 ? (count / total) * 100 : 0

        return (
          <div key={grade}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm">{GRADE_ICON[grade] ?? '●'}</span>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: GRADE_BG[grade]   ?? 'var(--bg-3)',
                    color:      GRADE_COLOR[grade] ?? 'var(--text-2)',
                  }}
                >
                  {GRADE_LABEL[grade] ?? grade}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-mono font-semibold text-ink">{count.toLocaleString()}명</span>
                <span className="text-[11px] text-ink-3 ml-1">({pct}%)</span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-bg-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${barPct}%`, background: GRADE_COLOR[grade] ?? 'var(--accent)' }}
              />
            </div>
          </div>
        )
      })}
      <div className="pt-1 text-right text-xs text-ink-3">
        전체 {total.toLocaleString()}명
      </div>
    </div>
  )
}

// ── 빠른 이동 위젯 ────────────────────────────────────────────────
interface QuickAction {
  label: string; href: string; icon: string; badge?: number; danger?: boolean
}

export function QuickActionsWidget({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map(action => (
        <Link
          key={action.href}
          href={action.href}
          className="flex items-center gap-2.5 p-3 rounded-xl border border-border hover:border-accent/40 hover:bg-bg-3 transition-all"
        >
          <span className="text-lg">{action.icon}</span>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-ink-2">{action.label}</span>
          </div>
          {action.badge !== undefined && action.badge > 0 && (
            <span className={`text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 ${
              action.danger ? 'bg-red-500 text-white' : 'bg-accent text-white'
            }`}>
              {action.badge > 99 ? '99+' : action.badge}
            </span>
          )}
        </Link>
      ))}
    </div>
  )
}
