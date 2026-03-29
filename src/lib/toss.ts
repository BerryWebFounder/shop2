// ── 토스페이먼츠 서버사이드 유틸 ─────────────────────────────────
// 환경변수:
//   TOSS_SECRET_KEY        = sk_test_... (테스트) / sk_live_... (운영)
//   NEXT_PUBLIC_TOSS_CLIENT_KEY = ck_test_... / ck_live_...

const TOSS_API_BASE = 'https://api.tosspayments.com/v1'

// Basic Auth 헤더 생성 (secretKey + ':')
function getTossAuthHeader(): string {
  const secretKey = process.env.TOSS_SECRET_KEY
  if (!secretKey) throw new Error('TOSS_SECRET_KEY가 설정되지 않았습니다')
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`
}

// ── 결제 승인 ────────────────────────────────────────────────────
export async function confirmPayment({
  paymentKey,
  orderId,
  amount,
}: {
  paymentKey: string
  orderId:   string
  amount:    number
}) {
  const res = await fetch(`${TOSS_API_BASE}/payments/confirm`, {
    method:  'POST',
    headers: {
      Authorization:  getTossAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new TossPaymentError(
      data.code    ?? 'UNKNOWN_ERROR',
      data.message ?? '결제 승인에 실패했습니다',
      res.status
    )
  }

  return data as TossPaymentResponse
}

// ── 결제 취소 ────────────────────────────────────────────────────
export async function cancelPayment({
  paymentKey,
  cancelReason,
  cancelAmount,
}: {
  paymentKey:   string
  cancelReason: string
  cancelAmount?: number   // 미입력 시 전액 취소
}) {
  const body: Record<string, unknown> = { cancelReason }
  if (cancelAmount !== undefined) body.cancelAmount = cancelAmount

  const res = await fetch(`${TOSS_API_BASE}/payments/${paymentKey}/cancel`, {
    method:  'POST',
    headers: {
      Authorization:  getTossAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new TossPaymentError(
      data.code    ?? 'CANCEL_FAILED',
      data.message ?? '결제 취소에 실패했습니다',
      res.status
    )
  }

  return data as TossPaymentResponse
}

// ── 결제 조회 ────────────────────────────────────────────────────
export async function getPayment(paymentKey: string) {
  const res = await fetch(`${TOSS_API_BASE}/payments/${paymentKey}`, {
    headers: { Authorization: getTossAuthHeader() },
  })
  const data = await res.json()
  if (!res.ok) throw new TossPaymentError(data.code, data.message, res.status)
  return data as TossPaymentResponse
}

// ── 주문 ID로 결제 조회 ───────────────────────────────────────────
export async function getPaymentByOrderId(orderId: string) {
  const res = await fetch(`${TOSS_API_BASE}/payments/orders/${orderId}`, {
    headers: { Authorization: getTossAuthHeader() },
  })
  const data = await res.json()
  if (!res.ok) throw new TossPaymentError(data.code, data.message, res.status)
  return data as TossPaymentResponse
}

// ── 에러 클래스 ──────────────────────────────────────────────────
export class TossPaymentError extends Error {
  constructor(
    public readonly code:       string,
    public readonly message:    string,
    public readonly statusCode: number
  ) {
    super(message)
    this.name = 'TossPaymentError'
  }
}

// ── 토스 응답 타입 (주요 필드) ───────────────────────────────────
export interface TossPaymentResponse {
  paymentKey:      string
  orderId:         string
  orderName:       string
  status:          string
  method:          string
  amount:          number
  totalAmount:     number
  balanceAmount:   number
  approvedAt:      string
  requestedAt:     string
  currency:        string

  // 카드
  card?: {
    number:        string    // 마스킹됨 (예: 4330********1234)
    installmentPlanMonths: number
    company:       string
    acquirerCode:  string
  }

  // 가상계좌
  virtualAccount?: {
    accountNumber: string
    bankCode:      string
    customerName:  string
    dueDate:       string
    expired:       boolean
    settlementStatus: string
  }

  // 간편결제
  easyPay?: {
    provider:        string   // KakaoPay, NaverPay, TossPay 등
    amount:          number
    discountAmount:  number
  }

  // 취소 내역
  cancels?: Array<{
    cancelAmount:  number
    cancelReason:  string
    canceledAt:    string
  }>

  // 웹훅/공통
  type:            string    // NORMAL, BILLING 등
  receipt?:        { url: string }
}

// ── 토스 결제 수단 → DB 타입 변환 ────────────────────────────────
export function toPaymentMethod(tossMethod: string): string {
  const map: Record<string, string> = {
    '카드':      'card',
    '가상계좌':  'virtual_account',
    '계좌이체':  'account_transfer',
    '휴대폰':    'mobile',
    '간편결제':  'easy_pay',
  }
  return map[tossMethod] ?? 'card'
}

// ── 결제 금액 검증 (위변조 방지) ─────────────────────────────────
export function validateAmount(expected: number, actual: number): boolean {
  return expected === actual
}
