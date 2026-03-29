'use client'
import {
  createContext, useContext, useReducer, useEffect, useCallback,
  type ReactNode,
} from 'react'
import {
  cartReducer, loadCart, saveCart, calcCartTotal, calcCartCount,
  type CartItem, type CartAction,
} from '@/lib/shop/cart'

interface CartContextValue {
  items:      CartItem[]
  count:      number
  total:      number
  dispatch:   (action: CartAction) => void
  addItem:    (item: Omit<CartItem, 'quantity'>, qty?: number) => void
  removeItem: (id: string) => void
  updateItem: (id: string, quantity: number) => void
  clearCart:  () => void
  isInCart:   (id: string) => boolean
  getItem:    (id: string) => CartItem | undefined
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, [], loadCart)

  // localStorage 동기화
  useEffect(() => { saveCart(items) }, [items])

  const addItem    = useCallback((item: Omit<CartItem, 'quantity'>, qty = 1) =>
    dispatch({ type: 'ADD', item, qty }), [])
  const removeItem = useCallback((id: string) =>
    dispatch({ type: 'REMOVE', id }), [])
  const updateItem = useCallback((id: string, quantity: number) =>
    dispatch({ type: 'UPDATE', id, quantity }), [])
  const clearCart  = useCallback(() => dispatch({ type: 'CLEAR' }), [])
  const isInCart   = useCallback((id: string) => items.some(i => i.id === id), [items])
  const getItem    = useCallback((id: string) => items.find(i => i.id === id), [items])

  return (
    <CartContext.Provider value={{
      items,
      count:  calcCartCount(items),
      total:  calcCartTotal(items),
      dispatch,
      addItem, removeItem, updateItem, clearCart, isInCart, getItem,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
