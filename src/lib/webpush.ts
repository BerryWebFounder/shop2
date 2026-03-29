// ── Web Push 서버사이드 유틸 ──────────────────────────────────────
// npm install web-push
// npm install --save-dev @types/web-push
//
// 환경변수:
//   VAPID_PUBLIC_KEY  = 공개키
//   VAPID_PRIVATE_KEY = 비공개키 (서버 전용 🔒)
//   VAPID_SUBJECT     = mailto:your@email.com 또는 사이트 URL
//
// VAPID 키 생성:
//   node -e "const wp = require('web-push'); const k = wp.generateVAPIDKeys(); console.log(k)"

import webpush from 'web-push'

let initialized = false

function initWebPush() {
  if (initialized) return
  const publicKey  = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject    = process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com'

  if (!publicKey || !privateKey) {
    throw new Error('VAPID_PUBLIC_KEY 또는 VAPID_PRIVATE_KEY가 설정되지 않았습니다')
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
  initialized = true
}

// ── 푸시 알림 페이로드 타입 ───────────────────────────────────────
export interface PushPayload {
  title:              string
  body:               string
  icon?:              string
  badge?:             string
  image?:             string
  url?:               string
  tag?:               string
  requireInteraction?: boolean
  actions?:           Array<{ action: string; title: string }>
  data?:              Record<string, unknown>
}

export interface PushSubscriptionData {
  endpoint: string
  p256dh:   string
  auth:     string
}

// ── 단일 구독에 푸시 발송 ─────────────────────────────────────────
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload:      PushPayload
): Promise<{ success: boolean; error?: string; statusCode?: number }> {
  initWebPush()

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth:   subscription.auth,
    },
  }

  try {
    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify({
        icon:  '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        ...payload,
      }),
      { TTL: 86400 }  // 24시간 유지
    )
    return { success: true }
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode
    const body       = (err as { body?: string }).body ?? String(err)

    // 410 = 구독 만료, 404 = 구독 없음 → 비활성화 필요
    if (statusCode === 410 || statusCode === 404) {
      return { success: false, error: 'SUBSCRIPTION_EXPIRED', statusCode }
    }

    return { success: false, error: body, statusCode }
  }
}

// ── 다수 구독에 배치 발송 ─────────────────────────────────────────
export async function sendPushToMany(
  subscriptions: Array<PushSubscriptionData & { id: string }>,
  payload:       PushPayload
): Promise<{ sent: number; failed: number; expired: string[] }> {
  const results = await Promise.allSettled(
    subscriptions.map(sub => sendPushNotification(sub, payload).then(r => ({ ...r, id: sub.id })))
  )

  let sent = 0, failed = 0
  const expired: string[] = []

  for (const result of results) {
    if (result.status === 'fulfilled') {
      if (result.value.success) {
        sent++
      } else {
        failed++
        if (result.value.error === 'SUBSCRIPTION_EXPIRED') {
          expired.push(result.value.id ?? '')
        }
      }
    } else {
      failed++
    }
  }

  return { sent, failed, expired }
}

// ── 주문 상태 알림 페이로드 빌더 ─────────────────────────────────
export function buildOrderStatusPayload(
  status:  string,
  orderNo: string,
  orderId: string
): PushPayload | null {
  const templates: Record<string, { title: string; body: string; actions?: Array<{ action: string; title: string }> }> = {
    paid: {
      title: '✅ 결제가 완료되었습니다',
      body:  `주문번호 ${orderNo} 결제가 확인되었습니다.`,
      actions: [{ action: 'view_order', title: '주문 확인' }],
    },
    preparing: {
      title: '📦 상품을 준비하고 있습니다',
      body:  `주문번호 ${orderNo} 상품을 포장하고 있습니다.`,
    },
    shipping: {
      title: '🚚 배송이 시작되었습니다',
      body:  `주문번호 ${orderNo} 배송이 시작되었습니다.`,
      actions: [{ action: 'view_order', title: '배송 추적' }],
    },
    delivered: {
      title: '🎉 배송이 완료되었습니다',
      body:  `주문번호 ${orderNo} 배송이 완료되었습니다. 상품은 만족스러우신가요?`,
      actions: [{ action: 'view_order', title: '리뷰 작성' }],
    },
    cancelled: {
      title: '❌ 주문이 취소되었습니다',
      body:  `주문번호 ${orderNo}이 취소 처리되었습니다.`,
    },
  }

  const template = templates[status]
  if (!template) return null

  return {
    ...template,
    url:  `/shop/orders/${orderId}`,
    tag:  `order-${orderId}`,
    requireInteraction: status === 'shipped',
  }
}
