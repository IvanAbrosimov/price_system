import { eq, ilike, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { products } from '../db/schema.js';
/**
 * Сервис для работы с товарами
 */
export class ProductsService {
    /**
     * Получить все товары
     */
    async getAll() {
        return db.select().from(products).orderBy(products.manufacturer, products.article);
    }
    /**
     * Получить товары по производителю
     */
    async getByManufacturer(manufacturer) {
        return db.select()
            .from(products)
            .where(eq(products.manufacturer, manufacturer))
            .orderBy(products.article);
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
     * Поиск товаров
     */
    async search(query) {
        const searchPattern = `%${query}%`;
        return db.select()
            .from(products)
            .where(or(ilike(products.article, searchPattern), ilike(products.name, searchPattern)))
            .orderBy(products.manufacturer, products.article)
            .limit(100);
    }
    /**
     * Получить список производителей
     */
    async getManufacturers() {
        const result = await db
            .selectDistinct({ manufacturer: products.manufacturer })
            .from(products)
            .orderBy(products.manufacturer);
        return result.map(r => r.manufacturer);
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
     * Получить количество товаров
     */
    async getCount() {
        const result = await db.select().from(products);
        return result.length;
    }
}
// Экспорт синглтона
export const productsService = new ProductsService();
