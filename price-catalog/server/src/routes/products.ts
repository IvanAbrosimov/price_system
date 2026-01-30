import { Router, Request, Response } from 'express'
import { productsService } from '../services/products.service.js'

const router = Router()

/**
 * GET /api/products
 * Получить товары с пагинацией
 * Query params:
 * - manufacturer: string - фильтр по производителю
 * - search: string - поиск по артикулу/наименованию
 * - limit: number - количество записей (по умолчанию 500, макс 2000)
 * - offset: number - смещение для пагинации
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { manufacturer, search, limit, offset } = req.query

    const paginationParams = {
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined
    }

    let result

    if (search && typeof search === 'string' && search.trim()) {
      result = await productsService.search(search.trim(), paginationParams)
    } else if (manufacturer && typeof manufacturer === 'string') {
      result = await productsService.getByManufacturer(manufacturer, paginationParams)
    } else {
      result = await productsService.getAll(paginationParams)
    }

    res.json({
      products: result.items,
      total: result.total,
      hasMore: result.hasMore,
      offset: paginationParams.offset || 0,
      limit: paginationParams.limit || 500
    })
  } catch (error) {
    console.error('Ошибка получения товаров:', error)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
})

/**
 * GET /api/products/count
 * Получить количество товаров
 */
router.get('/count', async (req: Request, res: Response) => {
  try {
    const { manufacturer } = req.query
    const count = await productsService.getCount(
      manufacturer && typeof manufacturer === 'string' ? manufacturer : undefined
    )
    res.json({ count })
  } catch (error) {
    console.error('Ошибка получения количества:', error)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
})

/**
 * GET /api/products/:article
 * Получить товар по артикулу
 */
router.get('/:article', async (req: Request, res: Response) => {
  try {
    const { article } = req.params
    const product = await productsService.getByArticle(article)

    if (!product) {
      res.status(404).json({ error: 'Товар не найден' })
      return
    }

    res.json(product)
  } catch (error) {
    console.error('Ошибка получения товара:', error)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
})

/**
 * GET /api/manufacturers
 * Получить список производителей с количеством товаров
 */
router.get('/meta/manufacturers', async (_req: Request, res: Response) => {
  try {
    const manufacturers = await productsService.getManufacturers()
    res.json({ manufacturers })
  } catch (error) {
    console.error('Ошибка получения производителей:', error)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
})

/**
 * GET /api/stock/:article
 * Получить остатки по артикулу
 */
router.get('/stock/:article', async (req: Request, res: Response) => {
  try {
    const { article } = req.params
    const stock = await productsService.getStock(article)

    if (!stock) {
      res.status(404).json({ error: 'Товар не найден' })
      return
    }

    res.json(stock)
  } catch (error) {
    console.error('Ошибка получения остатков:', error)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
})

export default router
