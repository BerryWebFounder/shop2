import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 주문 ID로 가상계좌 정보 조회 (입금 안내 페이지용)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const orderIdToss = searchParams.get('order_id') || ''

    if (!orderIdToss) {
      return NextResponse.json({ error: 'order_id가 필요합니다' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('payments')
      .select('virtual_account_number, virtual_account_bank, virtual_account_due, amount, status')
      .eq('order_id_toss', orderIdToss)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: '결제 정보를 찾을 수 없습니다' }, { status: 404 })
    }

    if (data.status !== 'waiting_for_deposit') {
      return NextResponse.json({ error: '가상계좌 대기 상태가 아닙니다', status: data.status })
    }

    // 은행 코드 → 이름 변환
    const BANK_NAMES: Record<string, string> = {
      '088': '신한은행', '004': 'KB국민은행', '003': 'IBK기업은행',
      '011': 'NH농협은행', '020': '우리은행', '081': 'KEB하나은행',
      '071': '우체국', '023': 'SC제일은행', '032': '부산은행',
      '034': '광주은행', '002': 'KDB산업은행',
    }

    return NextResponse.json({
      data: {
        account_number: data.virtual_account_number,
        bank_name:      BANK_NAMES[data.virtual_account_bank ?? ''] ?? data.virtual_account_bank,
        due_date:       data.virtual_account_due,
        amount:         data.amount,
        status:         data.status,
      }
    })
  } catch (err) {
    console.error('[GET /api/payment/virtual-account]', err)
    return NextResponse.json({ error: '조회에 실패했습니다' }, { status: 500 })
  }
}
