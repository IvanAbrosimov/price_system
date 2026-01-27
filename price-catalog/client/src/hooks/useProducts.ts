/**
 * Хук для загрузки и управления списком товаров
 */

import { useState, useEffect, useCallback } from 'react'
import { Product, ProductsResponse } from '../types'

// API URL - берём из переменных окружения или используем /api для локальной разработки
const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

// Демо-данные для работы без backend
const DEMO_PRODUCTS: Product[] = [
  { id: 1, manufacturer: 'Jung', article: 'ls1520', name: 'Розетка LS 990', priceRub: 1920, leadTimeDefault: '6-10 дней', astanaQty: 14, almatyQty: 2, catalogUrl: '', imageUrl: '', updatedAt: '' },
  { id: 2, manufacturer: 'Jung', article: 'ls991', name: 'Выключатель LS 990', priceRub: 2150, leadTimeDefault: '6-10 дней', astanaQty: 8, almatyQty: 5, catalogUrl: '', imageUrl: '', updatedAt: '' },
  { id: 3, manufacturer: 'Jung', article: 'cd581', name: 'Рамка CD 500', priceRub: 3450, leadTimeDefault: '10-14 дней', astanaQty: 0, almatyQty: 12, catalogUrl: '', imageUrl: '', updatedAt: '' },
  { id: 4, manufacturer: 'Legrand', article: 'val2410', name: 'Valena Life розетка', priceRub: 890, leadTimeDefault: '6-10 дней', astanaQty: 25, almatyQty: 10, catalogUrl: '', imageUrl: '', updatedAt: '' },
  { id: 5, manufacturer: 'Legrand', article: 'val2420', name: 'Valena Life выключатель', priceRub: 750, leadTimeDefault: '6-10 дней', astanaQty: 30, almatyQty: 15, catalogUrl: '', imageUrl: '', updatedAt: '' },
  { id: 6, manufacturer: 'Schneider Electric', article: 'easy9-2p', name: 'Easy9 Автомат 2P 16A', priceRub: 450, leadTimeDefault: '6-10 дней', astanaQty: 50, almatyQty: 30, catalogUrl: '', imageUrl: '', updatedAt: '' },
  { id: 7, manufacturer: 'Schneider Electric', article: 'resi9-1p', name: 'Resi9 Автомат 1P 25A', priceRub: 380, leadTimeDefault: '6-10 дней', astanaQty: 40, almatyQty: 20, catalogUrl: '', imageUrl: '', updatedAt: '' },
  { id: 8, manufacturer: 'Wago', article: '221-412', name: 'Клемма 221-412 2x4mm', priceRub: 45, leadTimeDefault: '10-14 дней', astanaQty: 0, almatyQty: 100, catalogUrl: '', imageUrl: '', updatedAt: '' },
  { id: 9, manufacturer: 'Wago', article: '221-415', name: 'Клемма 221-415 5x4mm', priceRub: 85, leadTimeDefault: '10-14 дней', astanaQty: 0, almatyQty: 80, catalogUrl: '', imageUrl: '', updatedAt: '' },
  { id: 10, manufacturer: 'Chint', article: 'nxb-63', name: 'NXB-63 Автомат 3P 32A', priceRub: 520, leadTimeDefault: '6-10 дней', astanaQty: 20, almatyQty: 15, catalogUrl: '', imageUrl: '', updatedAt: '' },
  { id: 11, manufacturer: 'DKC', article: 'dkc-35', name: 'Кабель-канал 35x20', priceRub: 120, leadTimeDefault: '6-10 дней', astanaQty: 100, almatyQty: 50, catalogUrl: '', imageUrl: '', updatedAt: '' },
  { id: 12, manufacturer: 'Merten', article: 'm-smart', name: 'M-Smart рамка 1 пост', priceRub: 1650, leadTimeDefault: '10-14 дней', astanaQty: 5, almatyQty: 8, catalogUrl: '', imageUrl: '', updatedAt: '' },
]

const DEMO_MANUFACTURERS = ['Jung', 'Legrand', 'Schneider Electric', 'Wago', 'Chint', 'DKC', 'Merten']

// Фильтрация демо-данных
function filterDemoProducts(manufacturer?: string, search?: string): Product[] {
  let filtered = [...DEMO_PRODUCTS]
  
  if (manufacturer && manufacturer !== 'Все') {
    filtered = filtered.filter(p => p.manufacturer === manufacturer)
  }
  
  if (search) {
    const searchLower = search.toLowerCase()
    filtered = filtered.filter(p => 
      p.article.toLowerCase().includes(searchLower) ||
      p.name.toLowerCase().includes(searchLower)
    )
  }
  
  return filtered
}

interface UseProductsOptions {
  manufacturer?: string
  search?: string
}

interface UseProductsResult {
  products: Product[]
  loading: boolean
  error: string | null
  total: number
  refetch: () => void
}

export function useProducts(options: UseProductsOptions = {}): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      
      if (options.manufacturer && options.manufacturer !== 'Все') {
        params.append('manufacturer', options.manufacturer)
      }
      
      if (options.search) {
        params.append('search', options.search)
      }

      const url = `${API_BASE}/products${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: ProductsResponse = await response.json()
      setProducts(data.products)
      setTotal(data.total)
    } catch (err) {
      // Fallback на демо-данные при ошибке API
      console.warn('API недоступен, используем демо-данные')
      const demoFiltered = filterDemoProducts(options.manufacturer, options.search)
      setProducts(demoFiltered)
      setTotal(demoFiltered.length)
      setError(null) // Не показываем ошибку в демо-режиме
    } finally {
      setLoading(false)
    }
  }, [options.manufacturer, options.search])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  return {
    products,
    loading,
    error,
    total,
    refetch: fetchProducts
  }
}

/**
 * Хук для загрузки списка производителей
 */
export function useManufacturers() {
  const [manufacturers, setManufacturers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchManufacturers = async () => {
      try {
        const response = await fetch(`${API_BASE}/manufacturers`)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        setManufacturers(data.manufacturers || [])
      } catch (err) {
        // Fallback на демо-данные
        console.warn('API manufacturers недоступен, используем демо-данные')
        setManufacturers(DEMO_MANUFACTURERS)
        setError(null)
      } finally {
        setLoading(false)
      }
    }

    fetchManufacturers()
  }, [])

  return { manufacturers, loading, error }
}

/**
 * Хук для получения остатков товара
 */
export function useStock(article: string) {
  const [stock, setStock] = useState<{ astana: number; almaty: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!article) return

    const fetchStock = async () => {
      setLoading(true)
      try {
        const response = await fetch(`${API_BASE}/stock/${encodeURIComponent(article)}`)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        setStock(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Ошибка'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    fetchStock()
  }, [article])

  return { stock, loading, error }
}
