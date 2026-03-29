'use client'
import {
  createContext, useContext, useReducer, useCallback,
  type ReactNode,
} from 'react'
import type { RealtimeNotification } from './useRealtimeNotifications'

// ── 상태 ──────────────────────────────────────────────────────────
interface NotificationState {
  items:     RealtimeNotification[]
  unread:    number
  panelOpen: boolean
}

type Action =
  | { type: 'ADD';         notification: RealtimeNotification }
  | { type: 'MARK_READ';   id: string }
  | { type: 'MARK_ALL_READ' }
  | { type: 'REMOVE';      id: string }
  | { type: 'CLEAR' }
  | { type: 'TOGGLE_PANEL' }
  | { type: 'CLOSE_PANEL' }

const MAX_ITEMS = 50   // 최대 보관 개수

function reducer(state: NotificationState, action: Action): NotificationState {
  switch (action.type) {
    case 'ADD': {
      const items  = [action.notification, ...state.items].slice(0, MAX_ITEMS)
      return { ...state, items, unread: state.unread + 1 }
    }
    case 'MARK_READ': {
      const items  = state.items.map(n => n.id === action.id ? { ...n, read: true } : n)
      const unread = items.filter(n => !n.read).length
      return { ...state, items, unread }
    }
    case 'MARK_ALL_READ': {
      const items  = state.items.map(n => ({ ...n, read: true }))
      return { ...state, items, unread: 0 }
    }
    case 'REMOVE': {
      const items  = state.items.filter(n => n.id !== action.id)
      const unread = items.filter(n => !n.read).length
      return { ...state, items, unread }
    }
    case 'CLEAR':
      return { ...state, items: [], unread: 0 }
    case 'TOGGLE_PANEL':
      return { ...state, panelOpen: !state.panelOpen }
    case 'CLOSE_PANEL':
      return { ...state, panelOpen: false }
    default:
      return state
  }
}

// ── Context ───────────────────────────────────────────────────────
interface NotificationContextValue {
  items:        RealtimeNotification[]
  unread:       number
  panelOpen:    boolean
  addNotification:  (n: RealtimeNotification) => void
  markRead:         (id: string) => void
  markAllRead:      () => void
  removeNotification: (id: string) => void
  clearAll:         () => void
  togglePanel:      () => void
  closePanel:       () => void
}

const Ctx = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    items: [], unread: 0, panelOpen: false,
  })

  const addNotification    = useCallback((n: RealtimeNotification) => dispatch({ type: 'ADD', notification: n }), [])
  const markRead           = useCallback((id: string)              => dispatch({ type: 'MARK_READ', id }), [])
  const markAllRead        = useCallback(()                        => dispatch({ type: 'MARK_ALL_READ' }), [])
  const removeNotification = useCallback((id: string)              => dispatch({ type: 'REMOVE', id }), [])
  const clearAll           = useCallback(()                        => dispatch({ type: 'CLEAR' }), [])
  const togglePanel        = useCallback(()                        => dispatch({ type: 'TOGGLE_PANEL' }), [])
  const closePanel         = useCallback(()                        => dispatch({ type: 'CLOSE_PANEL' }), [])

  return (
    <Ctx.Provider value={{
      ...state,
      addNotification, markRead, markAllRead,
      removeNotification, clearAll, togglePanel, closePanel,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
