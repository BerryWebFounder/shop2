// ================================================================
// Service Worker
// - 캐시 전략: Network First (쇼핑몰 동적 콘텐츠 우선)
// - 오프라인: 캐시 폴백
// - 웹 푸시 수신 및 표시
// ================================================================

const CACHE_NAME    = 'shop-v1'
const OFFLINE_URL   = '/shop/offline'
const STATIC_ASSETS = [
  '/',
  '/shop',
  '/shop/offline',
  '/manifest.json',
]

// ── 설치 이벤트 ────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// ── 활성화 이벤트 (이전 캐시 정리) ────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ── Fetch 이벤트 ──────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event

  // API / 외부 URL은 캐시 스킵
  if (
    request.url.includes('/api/') ||
    !request.url.startsWith(self.location.origin) ||
    request.method !== 'GET'
  ) return

  event.respondWith(
    fetch(request)
      .then(response => {
        // 성공한 응답을 캐시에 저장 (쇼핑몰 페이지만)
        if (
          response.ok &&
          (request.url.includes('/shop') || request.url.endsWith('/'))
        ) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
        }
        return response
      })
      .catch(() =>
        // 오프라인: 캐시에서 찾기, 없으면 오프라인 페이지
        caches.match(request).then(cached => {
          if (cached) return cached
          if (request.destination === 'document') {
            return caches.match(OFFLINE_URL)
          }
        })
      )
  )
})

// ── 푸시 수신 이벤트 ──────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: '새 알림', body: event.data.text() }
  }

  const {
    title   = '쇼핑몰',
    body    = '',
    icon    = '/icons/icon-192x192.png',
    badge   = '/icons/badge-72x72.png',
    image,
    url     = '/shop',
    tag,
    data    = {},
  } = payload

  const options = {
    body,
    icon,
    badge,
    image,
    tag:  tag ?? `push-${Date.now()}`,
    data: { url, ...data },
    vibrate: [100, 50, 100],
    actions: payload.actions ?? [],
    requireInteraction: payload.requireInteraction ?? false,
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// ── 알림 클릭 이벤트 ──────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()

  const targetUrl = event.notification.data?.url ?? '/shop'
  const action    = event.action

  // 액션별 URL 처리
  let url = targetUrl
  if (action === 'view_order') url = '/shop/orders'
  if (action === 'view_coupon') url = '/shop/support'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // 이미 열린 탭이 있으면 포커스
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // 없으면 새 탭
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

// ── 푸시 구독 변경 (만료 시 자동 갱신 알림) ──────────────────
self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: event.oldSubscription?.options?.applicationServerKey,
    }).then(subscription => {
      // 새 구독을 서버에 전송
      return fetch('/api/push/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ subscription, action: 'renew' }),
      })
    })
  )
})
