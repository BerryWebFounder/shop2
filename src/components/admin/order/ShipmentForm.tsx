'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { FormField, Input, Select } from '@/components/ui/Input'
import { CARRIERS, type OrderShipment } from '@/types/order'
import { formatDateTime } from '@/lib/utils'

interface ShipmentFormProps {
  orderId:   string
  shipment:  OrderShipment | null
  onSaved:   () => void
}

export function ShipmentForm({ orderId, shipment, onSaved }: ShipmentFormProps) {
  const [form, setForm] = useState({
    carrier_code:    shipment?.carrier_code    ?? 'cj',
    tracking_number: shipment?.tracking_number ?? '',
    memo:            shipment?.memo            ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSave() {
    if (!form.tracking_number.trim()) { setError('운송장 번호를 입력하세요'); return }
    setLoading(true); setError('')

    const res  = await fetch(`/api/orders/${orderId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? '저장 실패'); setLoading(false); return }

    setLoading(false)
    onSaved()
  }

  const selectedCarrier = CARRIERS.find(c => c.code === form.carrier_code)
  const trackingUrl     = selectedCarrier && form.tracking_number
    ? selectedCarrier.url(form.tracking_number)
    : null

  return (
    <div className="space-y-3">
      {/* 기존 송장 정보 */}
      {shipment && (
        <div className="p-3 rounded-xl text-sm"
          style={{ background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.2)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-accent font-semibold text-xs">등록된 송장</span>
            <span className="text-[11px] text-ink-3 font-mono">{formatDateTime(shipment.shipped_at)}</span>
          </div>
          <p className="text-ink font-medium">{shipment.carrier_name}</p>
          <p className="text-ink-2 font-mono text-sm">{shipment.tracking_number}</p>
          {shipment.tracking_url && (
            <a href={shipment.tracking_url} target="_blank" rel="noopener"
              className="text-accent text-xs hover:underline mt-1 inline-block">
              🔗 배송 추적 →
            </a>
          )}
        </div>
      )}

      {/* 등록/수정 폼 */}
      <FormField label={shipment ? '송장 수정' : '송장 등록'}>
        <Select
          value={form.carrier_code}
          onChange={e => setForm(f => ({ ...f, carrier_code: e.target.value }))}
          className="mb-2"
        >
          {CARRIERS.map(c => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </Select>
        <Input
          value={form.tracking_number}
          onChange={e => setForm(f => ({ ...f, tracking_number: e.target.value.replace(/\s/g, '') }))}
          placeholder="운송장 번호 입력"
          className="font-mono"
        />
      </FormField>

      <FormField label="메모 (선택)">
        <Input
          value={form.memo}
          onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
          placeholder="출고 메모, 특이사항 등"
        />
      </FormField>

      {/* 추적 URL 미리보기 */}
      {trackingUrl && (
        <a href={trackingUrl} target="_blank" rel="noopener"
          className="text-xs text-accent hover:underline flex items-center gap-1">
          🔗 {selectedCarrier?.name} 배송 추적 미리보기
        </a>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <Button variant="primary" loading={loading} onClick={handleSave} className="w-full">
        {shipment ? '송장 수정' : '송장 등록 (배송중으로 자동 전환)'}
      </Button>
    </div>
  )
}
