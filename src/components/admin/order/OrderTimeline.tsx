'use client'
import { formatDateTime } from '@/lib/utils'
import {
  ORDER_STATUS_LABEL, ORDER_STATUS_ICON,
  type OrderStatus, type OrderStatusHistory,
} from '@/types/order'

interface OrderTimelineProps {
  history: OrderStatusHistory[]
  currentStatus: OrderStatus
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'border-yellow-500 bg-yellow-500/10 text-yellow-400',
  paid:      'border-blue-500   bg-blue-500/10   text-blue-400',
  preparing: 'border-purple-500 bg-purple-500/10 text-purple-400',
  shipping:  'border-indigo-500 bg-indigo-500/10 text-indigo-400',
  delivered: 'border-green-500  bg-green-500/10  text-green-400',
  returned:  'border-red-500    bg-red-500/10    text-red-400',
  cancelled: 'border-gray-500   bg-gray-500/10   text-gray-400',
}

export function OrderTimeline({ history, currentStatus }: OrderTimelineProps) {
  const sorted = [...history].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return (
    <div className="relative">
      {/* 수직 라인 */}
      <div
        className="absolute left-4 top-5 bottom-5 w-px"
        style={{ background: 'var(--border)' }}
      />

      <div className="space-y-4">
        {sorted.map((item, idx) => {
          const isLast   = idx === sorted.length - 1
          const colorCls = STATUS_COLORS[item.to_status] ?? STATUS_COLORS.pending

          return (
            <div key={item.id} className="relative flex items-start gap-4 pl-1">
              {/* 아이콘 노드 */}
              <div
                className={`relative z-10 w-8 h-8 flex items-center justify-center rounded-full border-2 text-sm flex-shrink-0 ${colorCls}`}
              >
                {ORDER_STATUS_ICON[item.to_status as OrderStatus] ?? '●'}
              </div>

              {/* 내용 */}
              <div className={`flex-1 pb-4 ${isLast ? '' : 'border-b border-border'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-sm font-semibold text-ink">
                      {ORDER_STATUS_LABEL[item.to_status as OrderStatus] ?? item.to_status}
                    </span>
                    {item.from_status && (
                      <span className="text-xs text-ink-3 ml-2">
                        ({ORDER_STATUS_LABEL[item.from_status as OrderStatus] ?? item.from_status} →)
                      </span>
                    )}
                    <span className="ml-2 text-[11px] text-ink-3 font-mono">
                      {item.changed_by === 'admin' ? '👤 관리자' : '🤖 시스템'}
                    </span>
                  </div>
                  <span className="text-[11px] text-ink-3 font-mono flex-shrink-0">
                    {formatDateTime(item.created_at)}
                  </span>
                </div>
                {item.memo && (
                  <p className="text-xs text-ink-2 mt-1 leading-relaxed italic">
                    {item.memo}
                  </p>
                )}
              </div>
            </div>
          )
        })}

        {/* 현재 상태 (최신) */}
        {sorted.length === 0 && (
          <div className="relative flex items-start gap-4 pl-1">
            <div className={`relative z-10 w-8 h-8 flex items-center justify-center rounded-full border-2 text-sm flex-shrink-0 ${STATUS_COLORS[currentStatus] ?? STATUS_COLORS.pending}`}>
              {ORDER_STATUS_ICON[currentStatus]}
            </div>
            <div className="flex-1 pt-1">
              <span className="text-sm font-semibold text-ink">
                {ORDER_STATUS_LABEL[currentStatus]}
              </span>
              <p className="text-xs text-ink-3 mt-0.5">이력 없음</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
