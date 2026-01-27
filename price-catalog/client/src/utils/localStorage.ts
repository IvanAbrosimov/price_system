/**
 * Утилиты для работы с localStorage
 */

import { CartState, CartItem } from '../types'

const CART_KEY = 'price_catalog_cart'
const USER_ID_KEY = 'price_catalog_user_id'

/**
 * Генерация UUID для пользователя
 */
export function generateUserId(): string {
  return crypto.randomUUID()
}

/**
 * Получить или создать ID пользователя
 */
export function getUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY)
  if (!userId) {
    userId = generateUserId()
    localStorage.setItem(USER_ID_KEY, userId)
  }
  return userId
}

/**
 * Получить корзину из localStorage
 */
export function getCart(): CartState {
  try {
    const data = localStorage.getItem(CART_KEY)
    if (data) {
      return JSON.parse(data) as CartState
    }
  } catch (error) {
    console.error('Ошибка чтения корзины из localStorage:', error)
  }
  
  return {
    items: {},
    lastUpdated: new Date().toISOString()
  }
}

/**
 * Сохранить корзину в localStorage
 */
export function saveCart(cart: CartState): void {
  try {
    cart.lastUpdated = new Date().toISOString()
    localStorage.setItem(CART_KEY, JSON.stringify(cart))
  } catch (error) {
    console.error('Ошибка сохранения корзины в localStorage:', error)
  }
}

/**
 * Добавить товар в корзину
 */
export function addToCart(item: CartItem): CartState {
  const cart = getCart()
  cart.items[item.article] = item
  saveCart(cart)
  return cart
}

/**
 * Обновить количество товара в корзине
 */
export function updateCartItemQuantity(
  article: string, 
  quantity: number,
  leadTime: string
): CartState {
  const cart = getCart()
  
  if (quantity <= 0) {
    delete cart.items[article]
  } else if (cart.items[article]) {
    cart.items[article].quantity = quantity
    cart.items[article].leadTime = leadTime
  }
  
  saveCart(cart)
  return cart
}

/**
 * Удалить товар из корзины
 */
export function removeFromCart(article: string): CartState {
  const cart = getCart()
  delete cart.items[article]
  saveCart(cart)
  return cart
}

/**
 * Очистить корзину
 */
export function clearCart(): CartState {
  const emptyCart: CartState = {
    items: {},
    lastUpdated: new Date().toISOString()
  }
  saveCart(emptyCart)
  return emptyCart
}

/**
 * Получить количество товаров в корзине
 */
export function getCartItemsCount(): number {
  const cart = getCart()
  return Object.keys(cart.items).length
}

/**
 * Получить общую сумму корзины
 */
export function getCartTotal(): number {
  const cart = getCart()
  return Object.values(cart.items).reduce(
    (total, item) => total + item.priceRub * item.quantity,
    0
  )
}

/**
 * Получить количество товара в корзине по артикулу
 */
export function getCartItemQuantity(article: string): number {
  const cart = getCart()
  return cart.items[article]?.quantity || 0
}

/**
 * Проверить, есть ли товар в корзине
 */
export function isInCart(article: string): boolean {
  const cart = getCart()
  return article in cart.items
}
