import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
// Создаем тестовое приложение
const app = express();
app.use(express.json());
// Мок данных
const mockProducts = [
    {
        id: 1,
        manufacturer: 'Jung',
        article: 'ls1520',
        name: 'Розетка с заземлением LS990',
        priceRub: 1920,
        leadTimeDefault: '6-10 дней',
        astanaQty: 14,
        almatyQty: 2
    },
    {
        id: 2,
        manufacturer: 'Legrand',
        article: 'cd581',
        name: 'Выключатель одноклавишный',
        priceRub: 3450,
        leadTimeDefault: '10-14 дней',
        astanaQty: 5,
        almatyQty: 10
    },
    {
        id: 3,
        manufacturer: 'Jung',
        article: 'ls1912',
        name: 'Рамка 2-местная',
        priceRub: 2100,
        leadTimeDefault: '6-10 дней',
        astanaQty: 20,
        almatyQty: 5
    }
];
// Тестовые роуты (эмуляция реального API)
app.get('/api/products', (req, res) => {
    const { manufacturer } = req.query;
    let products = mockProducts;
    if (manufacturer) {
        products = products.filter(p => p.manufacturer.toLowerCase() === manufacturer.toLowerCase());
    }
    res.json({
        products,
        total: products.length
    });
});
app.get('/api/products/:article', (req, res) => {
    const { article } = req.params;
    const product = mockProducts.find(p => p.article.toLowerCase() === article.toLowerCase());
    if (!product) {
        return res.status(404).json({ error: 'Товар не найден' });
    }
    res.json(product);
});
app.get('/api/manufacturers', (req, res) => {
    const manufacturers = [...new Set(mockProducts.map(p => p.manufacturer))];
    res.json({ manufacturers });
});
app.get('/api/stock/:article', (req, res) => {
    const { article } = req.params;
    const product = mockProducts.find(p => p.article.toLowerCase() === article.toLowerCase());
    if (!product) {
        return res.status(404).json({ error: 'Товар не найден' });
    }
    res.json({
        article: product.article,
        astana: product.astanaQty,
        almaty: product.almatyQty
    });
});
describe('Products API', () => {
    describe('GET /api/products', () => {
        it('возвращает 200 и массив товаров', async () => {
            const response = await request(app)
                .get('/api/products')
                .expect('Content-Type', /json/)
                .expect(200);
            expect(response.body).toHaveProperty('products');
            expect(response.body).toHaveProperty('total');
            expect(Array.isArray(response.body.products)).toBe(true);
            expect(response.body.total).toBe(3);
        });
        it('каждый товар имеет необходимые поля', async () => {
            const response = await request(app)
                .get('/api/products')
                .expect(200);
            response.body.products.forEach((product) => {
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
    describe('GET /api/products?manufacturer=X', () => {
        it('фильтрует товары по производителю Jung', async () => {
            const response = await request(app)
                .get('/api/products?manufacturer=Jung')
                .expect(200);
            expect(response.body.products.length).toBe(2);
            response.body.products.forEach((product) => {
                expect(product.manufacturer).toBe('Jung');
            });
        });
        it('фильтрует товары по производителю Legrand', async () => {
            const response = await request(app)
                .get('/api/products?manufacturer=Legrand')
                .expect(200);
            expect(response.body.products.length).toBe(1);
            expect(response.body.products[0].manufacturer).toBe('Legrand');
        });
        it('возвращает пустой массив для несуществующего производителя', async () => {
            const response = await request(app)
                .get(`/api/products?manufacturer=${encodeURIComponent('NonExistentManufacturer')}`)
                .expect(200);
            expect(response.body.products.length).toBe(0);
        });
        it('фильтрация регистронезависимая', async () => {
            const response = await request(app)
                .get('/api/products?manufacturer=jung')
                .expect(200);
            expect(response.body.products.length).toBe(2);
        });
    });
    describe('GET /api/products/:article', () => {
        it('возвращает товар по артикулу', async () => {
            const response = await request(app)
                .get('/api/products/ls1520')
                .expect(200);
            expect(response.body.article).toBe('ls1520');
            expect(response.body.name).toBe('Розетка с заземлением LS990');
            expect(response.body.priceRub).toBe(1920);
        });
        it('возвращает 404 для несуществующего артикула', async () => {
            const response = await request(app)
                .get('/api/products/INVALID_ARTICLE')
                .expect(404);
            expect(response.body).toHaveProperty('error');
        });
        it('поиск регистронезависимый', async () => {
            const response = await request(app)
                .get('/api/products/LS1520')
                .expect(200);
            expect(response.body.article).toBe('ls1520');
        });
    });
    describe('GET /api/manufacturers', () => {
        it('возвращает список производителей', async () => {
            const response = await request(app)
                .get('/api/manufacturers')
                .expect(200);
            expect(response.body).toHaveProperty('manufacturers');
            expect(Array.isArray(response.body.manufacturers)).toBe(true);
            expect(response.body.manufacturers).toContain('Jung');
            expect(response.body.manufacturers).toContain('Legrand');
        });
        it('производители уникальные', async () => {
            const response = await request(app)
                .get('/api/manufacturers')
                .expect(200);
            const { manufacturers } = response.body;
            const unique = [...new Set(manufacturers)];
            expect(manufacturers.length).toBe(unique.length);
        });
    });
    describe('GET /api/stock/:article', () => {
        it('возвращает остатки для существующего товара', async () => {
            const response = await request(app)
                .get('/api/stock/ls1520')
                .expect(200);
            expect(response.body).toHaveProperty('article', 'ls1520');
            expect(response.body).toHaveProperty('astana', 14);
            expect(response.body).toHaveProperty('almaty', 2);
        });
        it('возвращает 404 для несуществующего артикула', async () => {
            const response = await request(app)
                .get('/api/stock/INVALID')
                .expect(404);
            expect(response.body).toHaveProperty('error');
        });
        it('поиск регистронезависимый', async () => {
            const response = await request(app)
                .get('/api/stock/LS1520')
                .expect(200);
            expect(response.body.astana).toBe(14);
        });
    });
});
