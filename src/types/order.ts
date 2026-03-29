export type OrderStatus =
  | 'pending'    // 결제 대기
  | 'paid'       // 결제 완료
  | 'preparing'  // 상품 준비 중
  | 'shipping'   // 배송 중
  | 'delivered'  // 배송 완료
  | 'returned'   // 반품 요청
  | 'cancelled'  // 취소

// 상태 전이 규칙 (from → 가능한 to 목록)
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:   ['paid', 'cancelled'],
  paid:      ['preparing', 'cancelled'],
  preparing: ['shipping', 'cancelled'],
  shipping:  ['delivered', 'returned'],
  delivered: ['returned'],
  returned:  [],
  cancelled: [],
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending:   '결제 대기',
  paid:      '결제 완료',
  preparing: '준비 중',
  shipping:  '배송 중',
  delivered: '배송 완료',
  returned:  '반품 요청',
  cancelled: '취소',
}

export const ORDER_STATUS_VARIANT: Record<OrderStatus, 'yellow' | 'blue' | 'purple' | 'indigo' | 'green' | 'red' | 'gray'> = {
  pending:   'yellow',
  paid:      'blue',
  preparing: 'purple',
  shipping:  'indigo',
  delivered: 'green',
  returned:  'red',
  cancelled: 'gray',
}

export const ORDER_STATUS_ICON: Record<OrderStatus, string> = {
  pending:   '⏳',
  paid:      '💳',
  preparing: '📦',
  shipping:  '🚚',
  delivered: '✅',
  returned:  '↩️',
  cancelled: '❌',
}

// 관리자 주문 목록용 타입 (member 이름 포함)
export interface OrderListItem {
  id:            string
  order_no:      string
  member_id:     string | null
  member_name:   string | null
  member_email:  string | null
  status:        OrderStatus
  total_amount:  number
  shipping_name: string | null
  created_at:    string
  updated_at:    string
  item_count?:   number
}

export interface OrderItem {
  id:           string
  order_id:     string
  product_id:   string | null
  product_name: string
  unit_price:   number
  sale_price:   number | null
  quantity:     number
}

export interface OrderStatusHistory {
  id:          string
  order_id:    string
  from_status: string | null
  to_status:   string
  memo:        string | null
  changed_by:  string
  created_at:  string
}

export interface OrderShipment {
  id:              string
  order_id:        string
  carrier_code:    string
  carrier_name:    string
  tracking_number: string
  tracking_url:    string | null
  shipped_at:      string
  delivered_at:    string | null
  memo:            string | null
}

export interface Order {
  id:               string
  order_no:         string
  member_id:        string | null
  status:           OrderStatus
  total_amount:     number
  coupon_discount:  number
  point_used:       number
  shipping_name:    string
  shipping_phone:   string
  shipping_address: string
  memo:             string | null
  coupon_id:        string | null
  paid_at:          string | null
  created_at:       string
  updated_at:       string
}

export interface OrderDetail extends Order {
  items:         OrderItem[]
  history:       OrderStatusHistory[]
  shipment:      OrderShipment | null
  member_name?:  string | null
  member_email?: string | null
  coupon_code?:  string | null
  coupon_name?:  string | null
}

// ── 택배사 목록 ───────────────────────────────────────────────────
export interface Carrier {
  code: string
  name: string
  url:  (trackingNo: string) => string
}

export const CARRIERS: Carrier[] = [
  { code: 'cj',     name: 'CJ대한통운',   url: no => `https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=${no}` },
  { code: 'lotte',  name: '롯데택배',     url: no => `https://www.lotteglogis.com/open/tracking?invno=${no}` },
  { code: 'hanjin', name: '한진택배',     url: no => `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=${no}` },
  { code: 'post',   name: '우체국택배',   url: no => `https://service.epost.go.kr/trace.RetrieveDomRefinedRacketDeliveryList.comm?sid1=${no}` },
  { code: 'logen',  name: '로젠택배',     url: no => `https://www.ilogen.com/iLogenEP/claim/cis/delivery/tracking?slipno=${no}` },
  { code: 'gs',     name: 'GS편의점택배', url: no => `https://www.cvsnet.co.kr/invoice/tracking.do?invoice_no=${no}` },
  { code: 'daesin', name: '대신택배',     url: no => `https://www.ds3211.co.kr/freight/internalFreightSearch.ht?billno=${no}` },
  { code: 'kdexp',  name: '경동택배',     url: no => `https://kdexp.com/tracking.do?barcode=${no}` },
]

export function getCarrierTrackingUrl(carrierCode: string, trackingNumber: string): string {
  const carrier = CARRIERS.find(c => c.code === carrierCode)
  return carrier ? carrier.url(trackingNumber) : ''
}
