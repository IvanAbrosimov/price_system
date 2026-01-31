# Настройка автоматизации Price System

## 0. Включение Google Drive API (ВАЖНО!)

1. Перейдите по ссылке: https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=price-system-intelligenthouse
2. Нажмите **"ENABLE"** (Включить)
3. Подождите 1-2 минуты

---

## 1. Настройка доступа к Google Drive

### Шаг 1: Расшарьте папку для Service Account

1. Откройте папку Price_System в Google Drive
2. Нажмите "Настройки доступа" (Share)
3. Добавьте email: `price-service-intelligenthouse@price-system-intelligenthouse.iam.gserviceaccount.com`
4. Выберите права: **Читатель** (Viewer)
5. Нажмите "Отправить"

---

## 2. Настройка GitHub Secrets

Перейдите в репозиторий GitHub → Settings → Secrets and variables → Actions

Добавьте следующие секреты:

### GOOGLE_CREDENTIALS_JSON
Содержимое файла `scripts/google_credentials.json` (весь JSON одной строкой)

### DATABASE_URL
```
postgresql://postgres:ваш_пароль@ваш_хост:5432/price_catalog
```
(возьмите из Railway)

### TELEGRAM_BOT_TOKEN
```
8579599270:AAE7-Ote1J1xlOKbkzF19eX4PmTTsl_ZU8I
```

### TELEGRAM_CHAT_IDS
```
272265312
```
(можно несколько через запятую: `272265312,123456789`)

---

## 3. Google Apps Script (авто-триггер при изменении файлов)

### Шаг 1: Создайте скрипт

1. Откройте https://script.google.com
2. Создайте новый проект
3. Вставьте код ниже:

```javascript
// Конфигурация
const GITHUB_TOKEN = 'ВАШ_GITHUB_TOKEN'; // Создайте в GitHub Settings → Developer settings → Personal access tokens
const GITHUB_REPO = 'IvanAbrosimov/price_system';
const FOLDER_ID = '1oxEm8YySlfqXVQOptkOc0_Eoq3WJWL06';

// Функция для запуска сборки
function triggerGitHubAction() {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/dispatches`;
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({
      event_type: 'build-price'
    })
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    Logger.log('GitHub Action triggered: ' + response.getResponseCode());
  } catch (e) {
    Logger.log('Error: ' + e.toString());
  }
}

// Проверка изменений в папке
function checkFolderChanges() {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const files = folder.getFiles();
  
  const props = PropertiesService.getScriptProperties();
  const lastCheck = props.getProperty('lastCheck');
  const now = new Date();
  
  let hasChanges = false;
  
  while (files.hasNext()) {
    const file = files.next();
    const lastUpdated = file.getLastUpdated();
    
    if (!lastCheck || lastUpdated > new Date(lastCheck)) {
      hasChanges = true;
      Logger.log('File changed: ' + file.getName());
    }
  }
  
  if (hasChanges) {
    triggerGitHubAction();
  }
  
  props.setProperty('lastCheck', now.toISOString());
}

// Ручной запуск
function manualTrigger() {
  triggerGitHubAction();
}
```

### Шаг 2: Настройте триггер

1. В редакторе скриптов нажмите "Триггеры" (часы слева)
2. Добавьте триггер:
   - Функция: `checkFolderChanges`
   - Источник: По времени
   - Тип: Минутный таймер
   - Интервал: Каждые 5 минут (или 15 минут)

### Шаг 3: Создайте GitHub Token

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token
3. Выберите scope: `repo` (Full control of private repositories)
4. Скопируйте токен в скрипт (GITHUB_TOKEN)

---

## 4. Telegram бот с кнопками (опционально)

Для создания полноценного бота с кнопкой "Пересобрать" нужно:

1. Создать простой сервер (можно на Railway)
2. Настроить webhook для бота
3. При нажатии кнопки - вызывать GitHub Actions

Пока что можно использовать ручной запуск:
- В GitHub → Actions → Build Price Catalog → Run workflow

---

## 5. Тестирование

### Локальный тест:
```bash
cd scripts
pip install -r requirements.txt
USE_GOOGLE_DRIVE=false python build.py  # С локальными файлами
```

### Тест с Google Drive:
```bash
cd scripts
python build.py  # Скачает файлы из Drive
```

### Тест GitHub Actions:
1. GitHub → Actions → Build Price Catalog
2. Run workflow → Run workflow
3. Проверьте логи и Telegram

---

## 6. Структура name_cache.xlsx

Создайте файл с колонками:
| Артикул | Наименование | Бренд | Источник |
|---------|--------------|-------|----------|
| 001254  | Выключатель 1-кл Valena Life | Legrand | manual |
| 787101  | Автомат iC60N 1P 16A | Schneider Electric | parser |

Система автоматически найдёт колонки "Артикул" и "Наименование".
