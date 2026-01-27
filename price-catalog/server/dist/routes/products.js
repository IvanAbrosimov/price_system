import { Router } from 'express';
import { productsService } from '../services/products.service.js';
const router = Router();
/**
 * GET /api/products
 * Получить все товары или фильтрованные по производителю
 */
router.get('/', async (req, res) => {
    try {
        const { manufacturer, search } = req.query;
        let products;
        if (search && typeof search === 'string') {
            products = await productsService.search(search);
        }
        else if (manufacturer && typeof manufacturer === 'string') {
            products = await productsService.getByManufacturer(manufacturer);
        }
        else {
            products = await productsService.getAll();
        }
        res.json({
            products,
            total: products.length
        });
    }
    catch (error) {
        console.error('Ошибка получения товаров:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
/**
 * GET /api/products/:article
 * Получить товар по артикулу
 */
router.get('/:article', async (req, res) => {
    try {
        const { article } = req.params;
        const product = await productsService.getByArticle(article);
        if (!product) {
            res.status(404).json({ error: 'Товар не найден' });
            return;
        }
        res.json(product);
    }
    catch (error) {
        console.error('Ошибка получения товара:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
/**
 * GET /api/manufacturers
 * Получить список производителей
 */
router.get('/meta/manufacturers', async (_req, res) => {
    try {
        const manufacturers = await productsService.getManufacturers();
        res.json({ manufacturers });
    }
    catch (error) {
        console.error('Ошибка получения производителей:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
/**
 * GET /api/stock/:article
 * Получить остатки по артикулу
 */
router.get('/stock/:article', async (req, res) => {
    try {
        const { article } = req.params;
        const stock = await productsService.getStock(article);
        if (!stock) {
            res.status(404).json({ error: 'Товар не найден' });
            return;
        }
        res.json(stock);
    }
    catch (error) {
        console.error('Ошибка получения остатков:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
export default router;
