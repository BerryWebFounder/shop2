'use client'
// 장바구니 상태 관리 — localStorage 기반
// Context + useReducer 패턴

export interface CartItem {
  id:          string   // product_id
  serial_no:   string
  name:        string
  price:       number
  sale_price:  number | null
  image_url:   string | null
  quantity:    number
  stock:       number
  cat1_name:   string | null
}

export type CartAction =
  | { type: 'ADD';    item: Omit<CartItem, 'quantity'>; qty?: number }
  | { type: 'REMOVE'; id: string }
  | { type: 'UPDATE'; id: string; quantity: number }
  | { type: 'CLEAR' }

const CART_KEY = 'shop_cart_v1'

export function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'ADD': {
      const existing = state.find(i => i.id === action.item.id)
      const addQty   = action.qty ?? 1
      if (existing) {
        return state.map(i =>
          i.id === action.item.id
            ? { ...i, quantity: Math.min(i.quantity + addQty, i.stock) }
            : i
        )
      }
      return [...state, { ...action.item, quantity: addQty }]
    }
    case 'REMOVE':
      return state.filter(i => i.id !== action.id)
    case 'UPDATE':
      return action.quantity <= 0
        ? state.filter(i => i.id !== action.id)
        : state.map(i =>
            i.id === action.id
              ? { ...i, quantity: Math.min(action.quantity, i.stock) }
              : i
          )
    case 'CLEAR':
      return []
    default:
      return state
  }
}

export function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CART_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items))
  } catch {}
}

export function calcCartTotal(items: CartItem[]): number {
  return items.reduce(
    (sum, i) => sum + (i.sale_price ?? i.price) * i.quantity,
    0
  )
}

export function calcCartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0)
}
