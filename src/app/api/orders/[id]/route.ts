import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { ORDER_STATUS_TRANSITIONS, CARRIERS, type OrderStatus } from '@/types/order'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = createClient()
    const [{ data: order }, { data: items }, { data: history }, { data: shipment }] = await Promise.all([
      supabase.from('order_detail_view').select('*').eq('id', id).single(),
      supabase.from('order_items').select('*').eq('order_id', id).order('created_at'),
      supabase.from('order_status_history').select('*').eq('order_id', id).order('created_at'),
      supabase.from('order_shipments').select('*').eq('order_id', id).single(),
    ])
    if (!order) return NextResponse.json({ error: '주문을 찾을 수 없습니다' }, { status: 404 })
    return NextResponse.json({ data: { ...order, items: items ?? [], history: history ?? [], shipment: shipment ?? null } })
  } catch (err) {
    console.error('[GET /api/orders/:id]', err)
    return NextResponse.json({ error: '주문 조회에 실패했습니다' }, { status: 500 })
  }
}

const statusSchema = z.object({
  status: z.enum(['pending','paid','preparing','shipping','delivered','returned','cancelled']),
  memo:   z.string().max(500).optional(),
})

const shipmentSchema = z.object({
  carrier_code:    z.string().min(1),
  tracking_number: z.string().min(4).max(50),
  memo:            z.string().max(200).optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = createClient()
    const body = await request.json()

    if ('status' in body) {
      const parsed = statusSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
      const { data: current } = await supabase.from('orders').select('status, member_id').eq('id', id).single()
      if (!current) return NextResponse.json({ error: '주문을 찾을 수 없습니다' }, { status: 404 })
      const currentStatus = current.status as OrderStatus
      const newStatus = parsed.data.status as OrderStatus
      if (!ORDER_STATUS_TRANSITIONS[currentStatus].includes(newStatus)) {
        return NextResponse.json({ error: `${currentStatus} → ${newStatus} 전환 불가` }, { status: 422 })
      }
      const updates: Record<string, unknown> = { status: newStatus }
      if (newStatus === 'shipping') updates.shipped_at = new Date().toISOString()
      const { data, error } = await supabase.from('orders').update(updates).eq('id', id).select().single()
      if (error) throw error
      if (parsed.data.memo) {
        await supabase.from('order_status_history').insert({ order_id: id, from_status: currentStatus, to_status: newStatus, memo: parsed.data.memo, changed_by: 'admin' })
      }
      if (newStatus === 'delivered' && current.member_id) {
        try { await supabase.rpc('earn_order_points', { p_order_id: id }) } catch {}
      }
      if (newStatus === 'cancelled') {
        try { await supabase.rpc('refund_points_on_cancel', { p_order_id: id }) } catch {}
      }
      return NextResponse.json({ data, message: `상태가 ${newStatus}로 변경되었습니다` })
    }

    if ('carrier_code' in body) {
      const parsed = shipmentSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
      const carrier = CARRIERS.find(c => c.code === parsed.data.carrier_code)
      if (!carrier) return NextResponse.json({ error: '지원하지 않는 택배사입니다' }, { status: 400 })
      const { data, error } = await supabase.from('order_shipments').upsert({
        order_id: id, carrier_code: parsed.data.carrier_code, carrier_name: carrier.name,
        tracking_number: parsed.data.tracking_number, tracking_url: carrier.url(parsed.data.tracking_number),
        memo: parsed.data.memo ?? null,
      }, { onConflict: 'order_id' }).select().single()
      if (error) throw error
      const { data: order } = await supabase.from('orders').select('status').eq('id', id).single()
      if (order?.status === 'preparing') {
        await supabase.from('orders').update({ status: 'shipping', shipped_at: new Date().toISOString() }).eq('id', id)
      }
      return NextResponse.json({ data, message: '송장이 등록되었습니다' })
    }

    return NextResponse.json({ error: '올바르지 않은 요청입니다' }, { status: 400 })
  } catch (err) {
    console.error('[PATCH /api/orders/:id]', err)
    return NextResponse.json({ error: '처리에 실패했습니다' }, { status: 500 })
  }
}
