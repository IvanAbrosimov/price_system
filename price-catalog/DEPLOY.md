# Деплой Price Catalog на Railway

## Быстрый деплой

### 1. Создайте аккаунт на Railway
https://railway.app

### 2. Создайте новый проект
```bash
# Установите Railway CLI
npm i -g @railway/cli

# Авторизуйтесь
railway login

# Инициализируйте проект
cd price-catalog
railway init
```

### 3. Добавьте PostgreSQL
```bash
railway add --plugin postgres
```

### 4. Настройте переменные окружения
В Railway Dashboard добавьте:
- `NODE_ENV=production`
- `DATABASE_URL` - автоматически из PostgreSQL плагина

### 5. Задеплойте
```bash
railway up
```

## Альтернатива: Docker Compose (VPS)

### На сервере:
```bash
# Клонируйте репозиторий
git clone <your-repo> && cd price-catalog

# Создайте .env файл
cat > .env << EOF
DATABASE_URL=postgresql://postgres:your_password@db:5432/price_catalog
NODE_ENV=production
EOF

# Запустите
docker-compose -f docker-compose.prod.yml up -d
```

## Загрузка данных после деплоя

```bash
# Установите DATABASE_URL
export DATABASE_URL="postgresql://..."

# Запустите build.py с флагом --postgres
python3 scripts/build.py --postgres
```

## CI/CD (GitHub Actions)

### Настройка секретов
1. Перейдите в Settings → Secrets and variables → Actions
2. Добавьте `RAILWAY_TOKEN` (получите в Railway Dashboard → Account → Tokens)

### Pipeline автоматически:
1. Запускает все тесты (backend, frontend, python)
2. Собирает Docker образы
3. Деплоит на Railway при push в main

## Мониторинг

### Health Check
```bash
curl https://your-app.railway.app/api/health
```

### Logs
```bash
railway logs
```

## Структура окружений

| Окружение | URL | База данных |
|-----------|-----|-------------|
| Development | localhost:5173 | localhost:5432 |
| Production | your-app.railway.app | Railway PostgreSQL |

## Troubleshooting

### Ошибка подключения к БД
- Проверьте DATABASE_URL
- Убедитесь что PostgreSQL запущен

### 504 Gateway Timeout
- Увеличьте healthcheckTimeout в railway.json
- Проверьте логи сервера

### Пустой каталог
- Запустите `python3 scripts/build.py --postgres`
- Проверьте что данные загрузились
