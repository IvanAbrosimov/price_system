import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import productsRouter from './routes/products.js';
import { testConnection } from './db/index.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
// Middleware
app.use(cors());
app.use(express.json());
// API Routes
app.use('/api/products', productsRouter);
// Дополнительный роут для производителей (чтобы не конфликтовал с :article)
app.get('/api/manufacturers', async (_req, res) => {
    try {
        const { productsService } = await import('./services/products.service.js');
        const manufacturers = await productsService.getManufacturers();
        res.json({ manufacturers });
    }
    catch (error) {
        console.error('Ошибка получения производителей:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
// Роут для остатков
app.get('/api/stock/:article', async (req, res) => {
    try {
        const { article } = req.params;
        const { productsService } = await import('./services/products.service.js');
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
// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    const clientPath = path.join(__dirname, '../../client/dist');
    app.use(express.static(clientPath));
    // SPA fallback
    app.get('*', (_req, res) => {
        res.sendFile(path.join(clientPath, 'index.html'));
    });
}
// Start server
async function start() {
    console.log('🚀 Запуск сервера...');
    // Проверяем подключение к БД
    const dbConnected = await testConnection();
    if (!dbConnected) {
        console.error('⚠️ Сервер запускается без подключения к БД');
    }
    app.listen(PORT, () => {
        console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
        console.log(`📦 API доступен на http://localhost:${PORT}/api`);
    });
}
start().catch(console.error);
