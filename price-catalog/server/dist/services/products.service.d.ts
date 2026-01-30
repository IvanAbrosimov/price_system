import { Product } from '../db/schema.js';
/**
 * Интерфейс для пагинации
 */
interface PaginationParams {
    limit?: number;
    offset?: number;
}
/**
 * Результат с пагинацией
 */
interface PaginatedResult<T> {
    items: T[];
    total: number;
    hasMore: boolean;
}
/**
 * Сервис для работы с товарами (оптимизированный)
 */
export declare class ProductsService {
    private readonly DEFAULT_LIMIT;
    private readonly MAX_LIMIT;
    /**
     * Получить все товары с пагинацией
     */
    getAll(params?: PaginationParams): Promise<PaginatedResult<Product>>;
    /**
     * Получить товары по производителю с пагинацией
     */
    getByManufacturer(manufacturer: string, params?: PaginationParams): Promise<PaginatedResult<Product>>;
    /**
     * Получить товар по артикулу
     */
    getByArticle(article: string): Promise<Product | null>;
    /**
     * Поиск товаров с пагинацией
     */
    search(query: string, params?: PaginationParams): Promise<PaginatedResult<Product>>;
    /**
     * Получить список производителей с количеством товаров
     */
    getManufacturers(): Promise<{
        name: string;
        count: number;
    }[]>;
    /**
     * Получить остатки по артикулу
     */
    getStock(article: string): Promise<{
        astana: number;
        almaty: number;
    } | null>;
    /**
     * Получить общее количество товаров
     */
    getCount(manufacturer?: string): Promise<number>;
}
export declare const productsService: ProductsService;
export {};
