import { eq, ilike, or, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import { products } from '../db/schema.js';
/**
 * Сервис для работы с товарами (оптимизированный)
 */
export class ProductsService {
    DEFAULT_LIMIT = 500;
    MAX_LIMIT = 2000;
    /**
     * Получить все товары с пагинацией
     */
    async getAll(params = {}) {
        const limit = Math.min(params.limit || this.DEFAULT_LIMIT, this.MAX_LIMIT);
        const offset = params.offset || 0;
        const [items, totalResult] = await Promise.all([
            db.select()
                .from(products)
                .orderBy(products.manufacturer, products.article)
                .limit(limit)
                .offset(offset),
            db.select({ count: count() }).from(products)
        ]);
        const total = totalResult[0]?.count || 0;
        return {
            items,
            total,
            hasMore: offset + items.length < total
        };
    }
    /**
     * Получить товары по производителю с пагинацией
     */
    async getByManufacturer(manufacturer, params = {}) {
        const limit = Math.min(params.limit || this.DEFAULT_LIMIT, this.MAX_LIMIT);
        const offset = params.offset || 0;
        const [items, totalResult] = await Promise.all([
            db.select()
                .from(products)
                .where(eq(products.manufacturer, manufacturer))
                .orderBy(products.article)
                .limit(limit)
                .offset(offset),
            db.select({ count: count() })
                .from(products)
                .where(eq(products.manufacturer, manufacturer))
        ]);
        const total = totalResult[0]?.count || 0;
        return {
            items,
            total,
            hasMore: offset + items.length < total
        };
    }
    /**
     * Получить товар по артикулу
     */
    async getByArticle(article) {
        const result = await db.select()
            .from(products)
            .where(eq(products.article, article.toLowerCase()))
            .limit(1);
        return result[0] || null;
    }
    /**
     * Поиск товаров с пагинацией
     */
    async search(query, params = {}) {
        const limit = Math.min(params.limit || this.DEFAULT_LIMIT, this.MAX_LIMIT);
        const offset = params.offset || 0;
        const searchPattern = `%${query}%`;
        const whereClause = or(ilike(products.article, searchPattern), ilike(products.name, searchPattern));
        const [items, totalResult] = await Promise.all([
            db.select()
                .from(products)
                .where(whereClause)
                .orderBy(products.manufacturer, products.article)
                .limit(limit)
                .offset(offset),
            db.select({ count: count() })
                .from(products)
                .where(whereClause)
        ]);
        const total = totalResult[0]?.count || 0;
        return {
            items,
            total,
            hasMore: offset + items.length < total
        };
    }
    /**
     * Получить список производителей с количеством товаров
     */
    async getManufacturers() {
        const result = await db
            .select({
            name: products.manufacturer,
            count: count()
        })
            .from(products)
            .groupBy(products.manufacturer)
            .orderBy(products.manufacturer);
        return result.map(r => ({
            name: r.name,
            count: r.count
        }));
    }
    /**
     * Получить остатки по артикулу
     */
    async getStock(article) {
        const product = await this.getByArticle(article);
        if (!product)
            return null;
        return {
            astana: product.astanaQty || 0,
            almaty: product.almatyQty || 0
        };
    }
    /**
     * Получить общее количество товаров
     */
    async getCount(manufacturer) {
        const query = manufacturer
            ? db.select({ count: count() }).from(products).where(eq(products.manufacturer, manufacturer))
            : db.select({ count: count() }).from(products);
        const result = await query;
        return result[0]?.count || 0;
    }
}
// Экспорт синглтона
export const productsService = new ProductsService();
