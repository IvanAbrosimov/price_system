/**
 * Хук для загрузки и управления списком товаров
 * С поддержкой пагинации, infinite scroll и кэширования
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Product, MANUFACTURER_GROUPS } from '../types'

// API URL
const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

// Константы
const PAGE_SIZE = 500
const DEBOUNCE_DELAY = 300

/**
 * Debounce функция
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Интерфейс ответа API
 */
interface ProductsApiResponse {
  products: Product[]
  total: number
  hasMore: boolean
  offset: number
  limit: number
}

interface UseProductsOptions {
  manufacturer?: string
  search?: string
}

interface UseProductsResult {
  products: Product[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  total: number
  hasMore: boolean
  loadMore: () => void
  refetch: () => void
}

/**
 * Кэш для хранения загруженных данных по производителям
 */
const productsCache = new Map<string, {
  products: Product[]
  total: number
  hasMore: boolean
  timestamp: number
}>()

const CACHE_TTL = 5 * 60 * 1000 // 5 минут

function getCacheKey(manufacturer?: string, search?: string): string {
  return `${manufacturer || 'all'}:${search || ''}`
}

function getFromCache(key: string) {
  const cached = productsCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached
  }
  return null
}

function setToCache(key: string, data: { products: Product[]; total: number; hasMore: boolean }) {
  productsCache.set(key, { ...data, timestamp: Date.now() })
}

export function useProducts(options: UseProductsOptions = {}): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Debounced search для уменьшения запросов
  const debouncedSearch = useDebounce(options.search, DEBOUNCE_DELAY)
  
  // Ключ кэша
  const cacheKey = useMemo(() => 
    getCacheKey(options.manufacturer, debouncedSearch),
    [options.manufacturer, debouncedSearch]
  )

  // Загрузка товаров
  const fetchProducts = useCallback(async (isLoadMore = false) => {
    // Отменяем предыдущий запрос
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    const currentOffset = isLoadMore ? offset : 0
    
    // Проверяем кэш для начальной загрузки
    if (!isLoadMore && !debouncedSearch) {
      const cached = getFromCache(cacheKey)
      if (cached) {
        setProducts(cached.products)
        setTotal(cached.total)
        setHasMore(cached.hasMore)
        setOffset(cached.products.length)
        setLoading(false)
        return
      }
    }

    if (isLoadMore) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setError(null)
    }

    try {
      // Формируем URL с параметрами
      const params = new URLSearchParams()
      params.set('limit', PAGE_SIZE.toString())
      params.set('offset', currentOffset.toString())
      
      if (options.manufacturer && options.manufacturer !== 'Все') {
        params.set('manufacturer', options.manufacturer)
      }
      
      if (debouncedSearch) {
        params.set('search', debouncedSearch)
      }

      const url = `${API_BASE}/products?${params.toString()}`
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: ProductsApiResponse = await response.json()
      
      if (isLoadMore) {
        const newProducts = [...products, ...data.products]
        setProducts(newProducts)
        setOffset(newProducts.length)
        
        // Обновляем кэш
        if (!debouncedSearch) {
          setToCache(cacheKey, {
            products: newProducts,
            total: data.total,
            hasMore: data.hasMore
          })
        }
      } else {
        setProducts(data.products)
        setOffset(data.products.length)
        
        // Сохраняем в кэш
        if (!debouncedSearch) {
          setToCache(cacheKey, {
            products: data.products,
            total: data.total,
            hasMore: data.hasMore
          })
        }
      }
      
      setTotal(data.total)
      setHasMore(data.hasMore)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return // Игнорируем отменённые запросы
      }
      
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка'
      console.error('Ошибка загрузки товаров:', message)
      setError(message)
      
      if (!isLoadMore) {
        setProducts([])
        setTotal(0)
        setHasMore(false)
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [options.manufacturer, debouncedSearch, offset, products, cacheKey])

  // Загрузка при изменении фильтров
  useEffect(() => {
    setOffset(0)
    setProducts([])
    fetchProducts(false)
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [options.manufacturer, debouncedSearch])

  // Загрузка следующей страницы
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchProducts(true)
    }
  }, [loadingMore, hasMore, fetchProducts])

  // Принудительное обновление
  const refetch = useCallback(() => {
    productsCache.delete(cacheKey)
    setOffset(0)
    fetchProducts(false)
  }, [cacheKey, fetchProducts])

  return {
    products,
    loading,
    loadingMore,
    error,
    total,
    hasMore,
    loadMore,
    refetch
  }
}

/**
 * Хук для загрузки списка производителей с количеством товаров
 */
interface ManufacturerInfo {
  name: string
  count: number
}

export function useManufacturers() {
  const [manufacturers, setManufacturers] = useState<ManufacturerInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchManufacturers = async () => {
      try {
        const response = await fetch(`${API_BASE}/products/meta/manufacturers`)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        setManufacturers(data.manufacturers || [])
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Ошибка'
        console.error('Ошибка загрузки производителей:', message)
        setError(message)
        // Используем fallback
        setManufacturers(
          Object.keys(MANUFACTURER_GROUPS).map(name => ({ name, count: 0 }))
        )
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
/**
 * Хук для загрузки товаров конкретного производителя (lazy loading)
 * Загружает данные только когда группа раскрыта
 */
export function useManufacturerProducts(manufacturer: string, isExpanded: boolean) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [loaded, setLoaded] = useState(false)
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const cacheKey = `manufacturer:${manufacturer}`

  // Загрузка товаров
  const fetchProducts = useCallback(async (isLoadMore = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    const currentOffset = isLoadMore ? offset : 0
    
    // Проверяем кэш
    if (!isLoadMore) {
      const cached = getFromCache(cacheKey)
      if (cached) {
        setProducts(cached.products)
        setTotal(cached.total)
        setHasMore(cached.hasMore)
        setOffset(cached.products.length)
        setLoaded(true)
        return
      }
    }

    if (isLoadMore) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const params = new URLSearchParams()
      params.set('limit', PAGE_SIZE.toString())
      params.set('offset', currentOffset.toString())
      params.set('manufacturer', manufacturer)

      const response = await fetch(`${API_BASE}/products?${params.toString()}`, {
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data: ProductsApiResponse = await response.json()
      
      if (isLoadMore) {
        const newProducts = [...products, ...data.products]
        setProducts(newProducts)
        setOffset(newProducts.length)
        setToCache(cacheKey, {
          products: newProducts,
          total: data.total,
          hasMore: data.hasMore
        })
      } else {
        setProducts(data.products)
        setOffset(data.products.length)
        setToCache(cacheKey, {
          products: data.products,
          total: data.total,
          hasMore: data.hasMore
        })
      }
      
      setTotal(data.total)
      setHasMore(data.hasMore)
      setLoaded(true)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [manufacturer, offset, products, cacheKey])

  // Загружаем только когда группа раскрыта и ещё не загружена
  useEffect(() => {
    if (isExpanded && !loaded && !loading) {
      fetchProducts(false)
    }
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [isExpanded, loaded, loading])

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchProducts(true)
    }
  }, [loadingMore, hasMore, fetchProducts])

  return {
    products,
    loading,
    loadingMore,
    error,
    total,
    hasMore,
    loadMore,
    loaded
  }
}

export function useStock(article: string) {
  const [stock, setStock] = useState<{ astana: number; almaty: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!article) return

    const fetchStock = async () => {
      setLoading(true)
      try {
        const response = await fetch(`${API_BASE}/products/stock/${encodeURIComponent(article)}`)
        
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
