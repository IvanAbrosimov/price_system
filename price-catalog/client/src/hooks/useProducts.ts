/**
 * Хук для загрузки и управления списком товаров
 */

import { useState, useEffect, useCallback } from 'react'
import { Product, ProductsResponse, MANUFACTURER_GROUPS } from '../types'

// API URL - берём из переменных окружения или используем /api для локальной разработки
const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

/**
 * Проверяет, принадлежит ли товар к группе производителя
 * @param productManufacturer - название производителя товара
 * @param groupName - название группы (вкладки)
 */
function belongsToManufacturerGroup(productManufacturer: string, groupName: string): boolean {
  const lines = MANUFACTURER_GROUPS[groupName]
  if (!lines) return false
  
  const productLower = productManufacturer.toLowerCase()
  
  // Проверяем совпадение с любой линейкой группы
  for (const line of lines) {
    const lineLower = line.toLowerCase()
    if (productLower.includes(lineLower) || lineLower.includes(productLower)) {
      return true
    }
  }
  
  return false
}

/**
 * Фильтрация товаров на клиенте (для работы с API данными)
 */
function filterProducts(
  products: Product[], 
  manufacturer?: string, 
  search?: string
): Product[] {
  let filtered = [...products]
  
  // Фильтрация по производителю (группе)
  if (manufacturer && manufacturer !== 'Все') {
    filtered = filtered.filter(p => belongsToManufacturerGroup(p.manufacturer, manufacturer))
  }
  
  // Фильтрация по поисковому запросу (артикул, наименование, производитель)
  if (search) {
    const searchLower = search.toLowerCase().trim()
    filtered = filtered.filter(p => 
      p.article.toLowerCase().includes(searchLower) ||
      p.name.toLowerCase().includes(searchLower) ||
      p.manufacturer.toLowerCase().includes(searchLower)
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
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  // Загрузка всех товаров с сервера
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Загружаем все товары без фильтров (фильтрацию делаем на клиенте)
      const url = `${API_BASE}/products`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: ProductsResponse = await response.json()
      setAllProducts(data.products)
      
      // Применяем фильтры на клиенте
      const filtered = filterProducts(data.products, options.manufacturer, options.search)
      setProducts(filtered)
      setTotal(filtered.length)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка'
      console.error('Ошибка загрузки товаров:', message)
      setError(message)
      setProducts([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  // Первоначальная загрузка
  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Применение фильтров при изменении параметров (без повторной загрузки)
  useEffect(() => {
    if (allProducts.length > 0) {
      const filtered = filterProducts(allProducts, options.manufacturer, options.search)
      setProducts(filtered)
      setTotal(filtered.length)
    }
  }, [allProducts, options.manufacturer, options.search])

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
        const message = err instanceof Error ? err.message : 'Ошибка'
        console.error('Ошибка загрузки производителей:', message)
        setError(message)
        // Используем список из MANUFACTURER_GROUPS как fallback
        setManufacturers(Object.keys(MANUFACTURER_GROUPS))
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
