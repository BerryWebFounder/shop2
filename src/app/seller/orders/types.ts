// src/app/seller/orders/types.ts
// 공통 타입을 re-export — 실제 타입은 src/lib/types/v2.ts에 정의
export type {
  SellerStore,
  SellerOrder,
  OrderItem,
  OrderItemStatus,
  Settlement,
  SettlementItem,
  SettlementStatus,
} from '@/lib/types/v2'
