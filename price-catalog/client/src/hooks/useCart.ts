/**
 * Хук для управления корзиной
 */

import { useState, useCallback, useEffect } from 'react'
import { CartState, CartItem, Product } from '../types'
import * as storage from '../utils/localStorage'
import { getDynamicLeadTime } from '../utils/leadTime'

export function useCart() {
  const [cart, setCart] = useState<CartState>(storage.getCart)

  // Синхронизация с localStorage при изменениях в других вкладках
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'price_catalog_cart') {
        setCart(storage.getCart())
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  /**
   * Добавить или обновить товар в корзине
   */
  const addItem = useCallback((product: Product, quantity: number) => {
    const leadTime = getDynamicLeadTime(
      product.astanaQty || 0,
      product.almatyQty || 0,
      quantity
    )

    const item: CartItem = {
      article: product.article,
      manufacturer: product.manufacturer,
      name: product.name,
      priceRub: product.priceRub,
      quantity,
      leadTime: leadTime.text,
      astanaQty: product.astanaQty || 0,
      almatyQty: product.almatyQty || 0
    }

    const newCart = storage.addToCart(item)
    setCart(newCart)
  }, [])

  /**
   * Обновить количество товара
   */
  const updateQuantity = useCallback((article: string, quantity: number, product?: Product) => {
    if (quantity <= 0) {
      const newCart = storage.removeFromCart(article)
      setCart(newCart)
      return
    }

    // Получаем текущий item для расчета срока
    const currentItem = cart.items[article]
    const astanaQty = product?.astanaQty || currentItem?.astanaQty || 0
    const almatyQty = product?.almatyQty || currentItem?.almatyQty || 0
    
    const leadTime = getDynamicLeadTime(astanaQty, almatyQty, quantity)
    
    const newCart = storage.updateCartItemQuantity(article, quantity, leadTime.text)
    setCart(newCart)
  }, [cart.items])

  /**
   * Удалить товар из корзины
   */
  const removeItem = useCallback((article: string) => {
    const newCart = storage.removeFromCart(article)
    setCart(newCart)
  }, [])

  /**
   * Очистить корзину
   */
  const clear = useCallback(() => {
    const newCart = storage.clearCart()
    setCart(newCart)
  }, [])

  /**
   * Получить количество товара по артикулу
   */
  const getQuantity = useCallback((article: string): number => {
    return cart.items[article]?.quantity || 0
  }, [cart.items])

  /**
   * Получить общую сумму
   */
  const getTotal = useCallback((): number => {
    return Object.values(cart.items).reduce(
      (total, item) => total + item.priceRub * item.quantity,
      0
    )
  }, [cart.items])

  /**
   * Получить количество позиций в корзине
   */
  const getItemsCount = useCallback((): number => {
    return Object.keys(cart.items).length
  }, [cart.items])

  /**
   * Получить общее количество товаров
   */
  const getTotalQuantity = useCallback((): number => {
    return Object.values(cart.items).reduce(
      (total, item) => total + item.quantity,
      0
    )
  }, [cart.items])

  /**
   * Проверить, есть ли товар в корзине
   */
  const isInCart = useCallback((article: string): boolean => {
    return article in cart.items
  }, [cart.items])

  return {
    cart,
    items: Object.values(cart.items),
    addItem,
    updateQuantity,
    removeItem,
    clear,
    getQuantity,
    getTotal,
    getItemsCount,
    getTotalQuantity,
    isInCart
  }
}
