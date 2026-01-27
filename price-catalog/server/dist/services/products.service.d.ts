import { Product } from '../db/schema.js';
/**
 * Сервис для работы с товарами
 */
export declare class ProductsService {
    /**
     * Получить все товары
     */
    getAll(): Promise<Product[]>;
    /**
     * Получить товары по производителю
     */
    getByManufacturer(manufacturer: string): Promise<Product[]>;
    /**
     * Получить товар по артикулу
     */
    getByArticle(article: string): Promise<Product | null>;
    /**
     * Поиск товаров
     */
    search(query: string): Promise<Product[]>;
    /**
     * Получить список производителей
     */
    getManufacturers(): Promise<string[]>;
    /**
     * Получить остатки по артикулу
     */
    getStock(article: string): Promise<{
        astana: number;
        almaty: number;
    } | null>;
    /**
     * Получить количество товаров
     */
    getCount(): Promise<number>;
}
export declare const productsService: ProductsService;
