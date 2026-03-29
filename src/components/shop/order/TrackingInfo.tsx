'use client'
import { formatDateTime } from '@/lib/utils'
import {
  ORDER_STATUS_LABEL, ORDER_STATUS_ICON,
  type OrderStatus, type OrderStatusHistory, type OrderShipment,
} from '@/types/order'

const STEP_ORDER: OrderStatus[] = ['pending', 'paid', 'preparing', 'shipping', 'delivered']

interface TrackingInfoProps {
  status:   OrderStatus
  history:  OrderStatusHistory[]
  shipment: OrderShipment | null
}

export function TrackingInfo({ status, history, shipment }: TrackingInfoProps) {
  const isCancelled = status === 'cancelled' || status === 'returned'
  const currentStep = STEP_ORDER.indexOf(status)

  return (
    <div>
      {/* 취소/반품 표시 */}
      {isCancelled ? (
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: 'rgba(196,80,58,0.06)', border: '1.5px solid rgba(196,80,58,0.2)' }}
        >
          <p className="text-3xl mb-2">{ORDER_STATUS_ICON[status]}</p>
          <p className="font-semibold" style={{ color: 'var(--shop-accent)' }}>
            {ORDER_STATUS_LABEL[status]}
          </p>
        </div>
      ) : (
        /* 진행 단계 표시 */
        <div className="mb-6">
          <div className="flex items-center">
            {STEP_ORDER.map((step, idx) => {
              const isDone    = idx <= currentStep
              const isActive  = idx === currentStep
              const isLast    = idx === STEP_ORDER.length - 1

              return (
                <div key={step} className="flex items-center" style={{ flex: isLast ? 'none' : '1' }}>
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                      style={{
                        background: isDone ? 'var(--shop-ink)' : 'var(--shop-bg2)',
                        color:      isDone ? 'white' : 'var(--shop-ink3)',
                        border:     isActive ? '2.5px solid var(--shop-accent)' : '2px solid transparent',
                        transform:  isActive ? 'scale(1.15)' : 'scale(1)',
                      }}
                    >
                      {ORDER_STATUS_ICON[step]}
                    </div>
                    <span
                      className="text-[10px] text-center leading-tight w-12"
                      style={{ color: isDone ? 'var(--shop-ink)' : 'var(--shop-ink3)', fontWeight: isActive ? 600 : 400 }}
                    >
                      {ORDER_STATUS_LABEL[step]}
                    </span>
                  </div>

                  {/* 연결선 */}
                  {!isLast && (
                    <div
                      className="flex-1 h-0.5 mx-1 -mt-5 transition-colors"
                      style={{ background: idx < currentStep ? 'var(--shop-ink)' : 'var(--shop-bg3)' }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 송장 정보 */}
      {shipment && (
        <div
          className="rounded-xl p-4 mb-4"
          style={{ background: 'var(--shop-bg2)', border: '1.5px solid var(--shop-border)' }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--shop-ink)' }}>🚚 배송 정보</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: 'var(--shop-ink3)' }}>택배사</span>
              <span style={{ color: 'var(--shop-ink)' }}>{shipment.carrier_name}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--shop-ink3)' }}>운송장 번호</span>
              <span className="font-mono font-semibold" style={{ color: 'var(--shop-ink)' }}>
                {shipment.tracking_number}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--shop-ink3)' }}>발송일</span>
              <span style={{ color: 'var(--shop-ink)' }}>{formatDateTime(shipment.shipped_at)}</span>
            </div>
          </div>
          {shipment.tracking_url && (
            <a
              href={shipment.tracking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: 'var(--shop-ink)', color: 'white' }}
            >
              🔍 {shipment.carrier_name} 배송 추적
            </a>
          )}
        </div>
      )}

      {/* 간단한 이력 */}
      {history.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--shop-ink3)' }}>
            처리 이력
          </h3>
          <div className="space-y-2">
            {[...history]
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map(h => (
                <div key={h.id} className="flex items-start justify-between gap-2">
                  <span className="text-sm" style={{ color: 'var(--shop-ink2)' }}>
                    {ORDER_STATUS_ICON[h.to_status as OrderStatus] ?? '●'}{' '}
                    {ORDER_STATUS_LABEL[h.to_status as OrderStatus] ?? h.to_status}
                  </span>
                  <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--shop-ink3)' }}>
                    {formatDateTime(h.created_at)}
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}
