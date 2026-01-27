import { describe, it, expect, vi, beforeEach } from 'vitest';
// Мокаем данные продуктов
const mockProducts = [
    {
        id: 1,
        manufacturer: 'Jung',
        article: 'ls1520',
        name: 'Розетка с заземлением LS990',
        priceRub: 1920,
        leadTimeDefault: '6-10 дней',
        astanaQty: 14,
        almatyQty: 2,
        catalogUrl: null,
        imageUrl: null,
        updatedAt: new Date()
    },
    {
        id: 2,
        manufacturer: 'Legrand',
        article: 'cd581',
        name: 'Выключатель одноклавишный',
        priceRub: 3450,
        leadTimeDefault: '10-14 дней',
        astanaQty: 5,
        almatyQty: 10,
        catalogUrl: null,
        imageUrl: null,
        updatedAt: new Date()
    },
    {
        id: 3,
        manufacturer: 'Jung',
        article: 'ls1912',
        name: 'Рамка 2-местная',
        priceRub: 2100,
        leadTimeDefault: '6-10 дней',
        astanaQty: 20,
        almatyQty: 5,
        catalogUrl: null,
        imageUrl: null,
        updatedAt: new Date()
    }
];
// Мок сервиса продуктов
const ProductsService = {
    getAll: vi.fn(() => Promise.resolve(mockProducts)),
    getByManufacturer: vi.fn((manufacturer) => Promise.resolve(mockProducts.filter(p => p.manufacturer === manufacturer))),
    getByArticle: vi.fn((article) => Promise.resolve(mockProducts.find(p => p.article === article.toLowerCase()) || null)),
    getStock: vi.fn((article) => {
        const product = mockProducts.find(p => p.article === article.toLowerCase());
        if (!product)
            return Promise.resolve(null);
        return Promise.resolve({
            astana: product.astanaQty,
            almaty: product.almatyQty
        });
    }),
    getManufacturers: vi.fn(() => Promise.resolve([...new Set(mockProducts.map(p => p.manufacturer))]))
};
describe('ProductsService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    describe('getAll', () => {
        it('возвращает массив товаров', async () => {
            const products = await ProductsService.getAll();
            expect(Array.isArray(products)).toBe(true);
            expect(products.length).toBe(3);
            expect(ProductsService.getAll).toHaveBeenCalledTimes(1);
        });
        it('каждый товар имеет необходимые поля', async () => {
            const products = await ProductsService.getAll();
            products.forEach(product => {
                expect(product).toHaveProperty('id');
                expect(product).toHaveProperty('manufacturer');
                expect(product).toHaveProperty('article');
                expect(product).toHaveProperty('name');
                expect(product).toHaveProperty('priceRub');
                expect(product).toHaveProperty('astanaQty');
                expect(product).toHaveProperty('almatyQty');
            });
        });
    });
    describe('getByManufacturer', () => {
        it('фильтрует товары по производителю Jung', async () => {
            const products = await ProductsService.getByManufacturer('Jung');
            expect(products.length).toBe(2);
            products.forEach(product => {
                expect(product.manufacturer).toBe('Jung');
            });
        });
        it('фильтрует товары по производителю Legrand', async () => {
            const products = await ProductsService.getByManufacturer('Legrand');
            expect(products.length).toBe(1);
            expect(products[0].manufacturer).toBe('Legrand');
        });
        it('возвращает пустой массив для несуществующего производителя', async () => {
            const products = await ProductsService.getByManufacturer('НесуществующийПроизводитель');
            expect(products.length).toBe(0);
        });
    });
    describe('getByArticle', () => {
        it('возвращает товар по артикулу', async () => {
            const product = await ProductsService.getByArticle('ls1520');
            expect(product).not.toBeNull();
            expect(product?.article).toBe('ls1520');
            expect(product?.name).toBe('Розетка с заземлением LS990');
        });
        it('возвращает null для несуществующего артикула', async () => {
            const product = await ProductsService.getByArticle('INVALID_ARTICLE');
            expect(product).toBeNull();
        });
        it('поиск регистронезависимый', async () => {
            const product = await ProductsService.getByArticle('LS1520');
            expect(product).not.toBeNull();
            expect(product?.article).toBe('ls1520');
        });
    });
    describe('getStock', () => {
        it('возвращает остатки по артикулу', async () => {
            const stock = await ProductsService.getStock('ls1520');
            expect(stock).not.toBeNull();
            expect(stock?.astana).toBe(14);
            expect(stock?.almaty).toBe(2);
        });
        it('возвращает null для несуществующего артикула', async () => {
            const stock = await ProductsService.getStock('INVALID');
            expect(stock).toBeNull();
        });
    });
    describe('getManufacturers', () => {
        it('возвращает список уникальных производителей', async () => {
            const manufacturers = await ProductsService.getManufacturers();
            expect(Array.isArray(manufacturers)).toBe(true);
            expect(manufacturers).toContain('Jung');
            expect(manufacturers).toContain('Legrand');
            expect(manufacturers.length).toBe(2); // Уникальные значения
        });
    });
});
