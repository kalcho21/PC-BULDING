'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Component } from '@/lib/types'

const CART_STORAGE_KEY = 'pc-builder-cart'

export interface CartItem {
  component: Component
  quantity: number
}

interface CartContextValue {
  items: CartItem[]
  totalItems: number
  totalPrice: number
  addToCart: (component: Component, quantity?: number) => void
  removeFromCart: (componentId: string) => void
  setQuantity: (componentId: string, quantity: number) => void
  clearCart: () => void
  isInCart: (componentId: string) => boolean
  getQuantity: (componentId: string) => number
}

const CartContext = createContext<CartContextValue | null>(null)

function normalizeItems(items: CartItem[]): CartItem[] {
  return items
    .filter((item) => item.component?.id && item.quantity > 0)
    .map((item) => ({
      component: item.component,
      quantity: Math.max(1, Math.floor(item.quantity)),
    }))
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY)
      if (!raw) {
        setIsLoaded(true)
        return
      }

      const parsed = JSON.parse(raw) as CartItem[]
      setItems(normalizeItems(parsed))
    } catch {
      setItems([])
    } finally {
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  }, [isLoaded, items])

  const addToCart = useCallback((component: Component, quantity = 1) => {
    const nextQuantity = Math.max(1, Math.floor(quantity))
    setItems((prev) => {
      const existing = prev.find((item) => item.component.id === component.id)
      if (!existing) {
        return [...prev, { component, quantity: nextQuantity }]
      }

      return prev.map((item) =>
        item.component.id === component.id
          ? { ...item, component, quantity: item.quantity + nextQuantity }
          : item
      )
    })
  }, [])

  const removeFromCart = useCallback((componentId: string) => {
    setItems((prev) => prev.filter((item) => item.component.id !== componentId))
  }, [])

  const setQuantity = useCallback((componentId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.component.id !== componentId))
      return
    }

    const safeQuantity = Math.max(1, Math.floor(quantity))
    setItems((prev) =>
      prev.map((item) =>
        item.component.id === componentId ? { ...item, quantity: safeQuantity } : item
      )
    )
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  )

  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + item.component.price * item.quantity, 0),
    [items]
  )

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      totalItems,
      totalPrice,
      addToCart,
      removeFromCart,
      setQuantity,
      clearCart,
      isInCart: (componentId: string) => items.some((item) => item.component.id === componentId),
      getQuantity: (componentId: string) =>
        items.find((item) => item.component.id === componentId)?.quantity ?? 0,
    }),
    [items, totalItems, totalPrice, addToCart, removeFromCart, setQuantity, clearCart]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }

  return context
}
