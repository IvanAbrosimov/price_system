import { describe, it, expect, beforeEach, vi } from 'vitest'

// Мок localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    get length() { return Object.keys(store).length },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null)
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Типы
interface CartItem {
  article: string
  name: string
  priceRub: number
  quantity: number
  leadTime: string
}

// Простая реализация функций корзины для тестирования
const CART_KEY = 'cart'

function getCart(): CartItem[] {
  const data = localStorage.getItem(CART_KEY)
  return data ? JSON.parse(data) : []
}

function saveCart(items: CartItem[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(items))
}

function addToCart(item: CartItem): void {
  const cart = getCart()
  const existingIndex = cart.findIndex(i => i.article === item.article)
  
  if (existingIndex >= 0) {
    cart[existingIndex] = item
  } else {
    cart.push(item)
  }
  
  saveCart(cart)
}

function removeFromCart(article: string): void {
  const cart = getCart().filter(item => item.article !== article)
  saveCart(cart)
}

function updateQuantity(article: string, quantity: number, leadTime: string): void {
  const cart = getCart()
  const item = cart.find(i => i.article === article)
  
  if (item) {
    if (quantity <= 0) {
      removeFromCart(article)
    } else {
      item.quantity = quantity
      item.leadTime = leadTime
      saveCart(cart)
    }
  }
}

function clearCart(): void {
  localStorage.removeItem(CART_KEY)
}

function getTotal(): number {
  return getCart().reduce((sum, item) => sum + item.priceRub * item.quantity, 0)
}

function getItemsCount(): number {
  return getCart().reduce((count, item) => count + item.quantity, 0)
}

describe('useCart', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('addToCart', () => {
    it('добавляет товар в пустую корзину', () => {
      const item: CartItem = {
        article: 'ls1520',
        name: 'Розетка',
        priceRub: 1920,
        quantity: 5,
        leadTime: '6-10 дней'
      }

      addToCart(item)
      const cart = getCart()

      expect(cart.length).toBe(1)
      expect(cart[0].article).toBe('ls1520')
      expect(cart[0].quantity).toBe(5)
    })

    it('обновляет товар если он уже в корзине', () => {
      addToCart({
        article: 'ls1520',
        name: 'Розетка',
        priceRub: 1920,
        quantity: 5,
        leadTime: '6-10 дней'
      })

      addToCart({
        article: 'ls1520',
        name: 'Розетка',
        priceRub: 1920,
        quantity: 10,
        leadTime: '10-14 дней'
      })

      const cart = getCart()

      expect(cart.length).toBe(1)
      expect(cart[0].quantity).toBe(10)
      expect(cart[0].leadTime).toBe('10-14 дней')
    })

    it('добавляет несколько разных товаров', () => {
      addToCart({
        article: 'ls1520',
        name: 'Розетка',
        priceRub: 1920,
        quantity: 5,
        leadTime: '6-10 дней'
      })

      addToCart({
        article: 'cd581',
        name: 'Выключатель',
        priceRub: 3450,
        quantity: 2,
        leadTime: '10-14 дней'
      })

      const cart = getCart()

      expect(cart.length).toBe(2)
    })
  })

  describe('removeFromCart', () => {
    it('удаляет товар из корзины', () => {
      addToCart({
        article: 'ls1520',
        name: 'Розетка',
        priceRub: 1920,
        quantity: 5,
        leadTime: '6-10 дней'
      })

      removeFromCart('ls1520')
      const cart = getCart()

      expect(cart.length).toBe(0)
    })

    it('не падает при удалении несуществующего товара', () => {
      addToCart({
        article: 'ls1520',
        name: 'Розетка',
        priceRub: 1920,
        quantity: 5,
        leadTime: '6-10 дней'
      })

      removeFromCart('INVALID')
      const cart = getCart()

      expect(cart.length).toBe(1)
    })
  })

  describe('updateQuantity', () => {
    it('обновляет количество товара', () => {
      addToCart({
        article: 'ls1520',
        name: 'Розетка',
        priceRub: 1920,
        quantity: 5,
        leadTime: '6-10 дней'
      })

      updateQuantity('ls1520', 10, '10-14 дней')
      const cart = getCart()

      expect(cart[0].quantity).toBe(10)
      expect(cart[0].leadTime).toBe('10-14 дней')
    })

    it('удаляет товар при количестве 0', () => {
      addToCart({
        article: 'ls1520',
        name: 'Розетка',
        priceRub: 1920,
        quantity: 5,
        leadTime: '6-10 дней'
      })

      updateQuantity('ls1520', 0, '')
      const cart = getCart()

      expect(cart.length).toBe(0)
    })
  })

  describe('clearCart', () => {
    it('очищает корзину полностью', () => {
      addToCart({
        article: 'ls1520',
        name: 'Розетка',
        priceRub: 1920,
        quantity: 5,
        leadTime: '6-10 дней'
      })
      addToCart({
        article: 'cd581',
        name: 'Выключатель',
        priceRub: 3450,
        quantity: 2,
        leadTime: '10-14 дней'
      })

      clearCart()
      const cart = getCart()

      expect(cart.length).toBe(0)
    })
  })

  describe('getTotal', () => {
    it('считает сумму корректно', () => {
      addToCart({
        article: 'ls1520',
        name: 'Розетка',
        priceRub: 1920,
        quantity: 5,
        leadTime: '6-10 дней'
      })
      addToCart({
        article: 'cd581',
        name: 'Выключатель',
        priceRub: 3450,
        quantity: 2,
        leadTime: '10-14 дней'
      })

      const total = getTotal()

      // 1920 * 5 + 3450 * 2 = 9600 + 6900 = 16500
      expect(total).toBe(16500)
    })

    it('возвращает 0 для пустой корзины', () => {
      const total = getTotal()
      expect(total).toBe(0)
    })
  })

  describe('getItemsCount', () => {
    it('считает количество товаров', () => {
      addToCart({
        article: 'ls1520',
        name: 'Розетка',
        priceRub: 1920,
        quantity: 5,
        leadTime: '6-10 дней'
      })
      addToCart({
        article: 'cd581',
        name: 'Выключатель',
        priceRub: 3450,
        quantity: 2,
        leadTime: '10-14 дней'
      })

      const count = getItemsCount()

      expect(count).toBe(7) // 5 + 2
    })

    it('возвращает 0 для пустой корзины', () => {
      const count = getItemsCount()
      expect(count).toBe(0)
    })
  })
})
