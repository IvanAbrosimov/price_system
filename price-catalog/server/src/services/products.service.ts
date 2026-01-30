import { eq, ilike, or, sql, count, asc } from 'drizzle-orm'
import { db } from '../db/index.js'
import { products, Product } from '../db/schema.js'

/**
 * Сортировка по приоритету срока доставки:
 * 0 - есть на складе Астаны (быстрая доставка)
 * 1 - есть на складе Алматы (средняя доставка)
 * 2 - нет на складах (по запросу)
 */
const leadTimePriority = sql`CASE 
  WHEN ${products.astanaQty} > 0 THEN 0 
  WHEN ${products.almatyQty} > 0 THEN 1 
  ELSE 2 
END`

/**
 * Интерфейс для пагинации
 */
interface PaginationParams {
  limit?: number
  offset?: number
}

/**
 * Результат с пагинацией
 */
interface PaginatedResult<T> {
  items: T[]
  total: number
  hasMore: boolean
}

/**
 * Сервис для работы с товарами (оптимизированный)
 */
export class ProductsService {
  private readonly DEFAULT_LIMIT = 500
  private readonly MAX_LIMIT = 2000

  /**
   * Получить все товары с пагинацией
   * Сортировка: сначала по сроку (наличие), затем по алфавиту
   */
  async getAll(params: PaginationParams = {}): Promise<PaginatedResult<Product>> {
    const limit = Math.min(params.limit || this.DEFAULT_LIMIT, this.MAX_LIMIT)
    const offset = params.offset || 0

    const [items, totalResult] = await Promise.all([
      db.select()
        .from(products)
        .orderBy(leadTimePriority, asc(products.name))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(products)
    ])

    const total = totalResult[0]?.count || 0

    return {
      items,
      total,
      hasMore: offset + items.length < total
    }
  }

  /**
   * Получить товары по производителю с пагинацией
   * Сортировка: сначала по сроку (наличие), затем по алфавиту
   */
  async getByManufacturer(manufacturer: string, params: PaginationParams = {}): Promise<PaginatedResult<Product>> {
    const limit = Math.min(params.limit || this.DEFAULT_LIMIT, this.MAX_LIMIT)
    const offset = params.offset || 0

    const [items, totalResult] = await Promise.all([
      db.select()
        .from(products)
        .where(eq(products.manufacturer, manufacturer))
        .orderBy(leadTimePriority, asc(products.name))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() })
        .from(products)
        .where(eq(products.manufacturer, manufacturer))
    ])

    const total = totalResult[0]?.count || 0

    return {
      items,
      total,
      hasMore: offset + items.length < total
    }
  }

  /**
   * Получить товар по артикулу
   */
  async getByArticle(article: string): Promise<Product | null> {
    const result = await db.select()
      .from(products)
      .where(eq(products.article, article.toLowerCase()))
      .limit(1)
    
    return result[0] || null
  }

  /**
   * Поиск товаров с пагинацией
   * Сортировка: сначала по сроку (наличие), затем по алфавиту
   */
  async search(query: string, params: PaginationParams = {}): Promise<PaginatedResult<Product>> {
    const limit = Math.min(params.limit || this.DEFAULT_LIMIT, this.MAX_LIMIT)
    const offset = params.offset || 0
    const searchPattern = `%${query}%`

    const whereClause = or(
      ilike(products.article, searchPattern),
      ilike(products.name, searchPattern)
    )

    const [items, totalResult] = await Promise.all([
      db.select()
        .from(products)
        .where(whereClause)
        .orderBy(leadTimePriority, asc(products.name))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() })
        .from(products)
        .where(whereClause)
    ])

    const total = totalResult[0]?.count || 0

    return {
      items,
      total,
      hasMore: offset + items.length < total
    }
  }

  /**
   * Получить список производителей с количеством товаров
   */
  async getManufacturers(): Promise<{ name: string; count: number }[]> {
    const result = await db
      .select({
        name: products.manufacturer,
        count: count()
      })
      .from(products)
      .groupBy(products.manufacturer)
      .orderBy(products.manufacturer)
    
    return result.map(r => ({
      name: r.name,
      count: r.count
    }))
  }

  /**
   * Получить остатки по артикулу
   */
  async getStock(article: string): Promise<{ astana: number; almaty: number } | null> {
    const product = await this.getByArticle(article)
    if (!product) return null
    
    return {
      astana: product.astanaQty || 0,
      almaty: product.almatyQty || 0
    }
  }

  /**
   * Получить общее количество товаров
   */
  async getCount(manufacturer?: string): Promise<number> {
    const query = manufacturer
      ? db.select({ count: count() }).from(products).where(eq(products.manufacturer, manufacturer))
      : db.select({ count: count() }).from(products)
    
    const result = await query
    return result[0]?.count || 0
  }
}

// Экспорт синглтона
export const productsService = new ProductsService()
