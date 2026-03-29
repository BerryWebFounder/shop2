import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const orderSchema = z.object({
  member_id:        z.string().uuid().nullable().optional(),
  shipping_name:    z.string().min(1, '수령인을 입력하세요'),
  shipping_phone:   z.string().min(1, '연락처를 입력하세요'),
  shipping_address: z.string().min(1, '주소를 입력하세요'),
  memo:             z.string().max(500).nullable().optional(),
  items: z.array(z.object({
    product_id:   z.string().uuid(),
    product_name: z.string(),
    unit_price:   z.number().int().min(0),
    sale_price:   z.number().int().min(0).nullable().optional(),
    quantity:     z.number().int().min(1),
  })).min(1, '상품을 선택해주세요'),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body     = await request.json()
    const parsed   = orderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { items, ...orderData } = parsed.data

    // 재고 확인
    const productIds = items.map(i => i.product_id)
    const { data: products } = await supabase
      .from('products')
      .select('id, name, stock, status')
      .in('id', productIds)

    for (const item of items) {
      const product = products?.find(p => p.id === item.product_id)
      if (!product)                  return NextResponse.json({ error: `상품을 찾을 수 없습니다: ${item.product_name}` }, { status: 400 })
      if (product.status === 'stop') return NextResponse.json({ error: `판매중지 상품입니다: ${product.name}` }, { status: 400 })
      if (product.stock < item.quantity) return NextResponse.json({ error: `재고가 부족합니다: ${product.name} (재고 ${product.stock}개)` }, { status: 400 })
    }

    // 주문 생성 (order_no는 트리거가 자동 생성)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        ...orderData,
        status:       'pending',
        total_amount: 0, // order_items 삽입 후 트리거가 자동 합산
      })
      .select()
      .single()

    if (orderError) throw orderError

    // 주문 상품 삽입
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(
        items.map(item => ({
          order_id:     order.id,
          product_id:   item.product_id,
          product_name: item.product_name,
          unit_price:   item.unit_price,
          sale_price:   item.sale_price ?? null,
          quantity:     item.quantity,
        }))
      )

    if (itemsError) throw itemsError

    // 최신 주문 조회 (total_amount 트리거 반영 후)
    const { data: finalOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order.id)
      .single()

    // last_login 갱신 (회원 주문의 경우)
    if (orderData.member_id) {
      await supabase.rpc('update_member_last_login', { p_email: orderData.member_id }) // 실패해도 주문은 성공 처리
    }

    return NextResponse.json(
      { data: finalOrder, message: '주문이 완료되었습니다' },
      { status: 201 }
    )
  } catch (err) {
    console.error('[POST /api/shop/orders]', err)
    return NextResponse.json(
      { error: '주문 처리 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
