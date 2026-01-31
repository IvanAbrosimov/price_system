"""
Price System - Автоматизированная система генерации прайс-листов
Версия: 5.0 (Google Drive + Telegram + Name Cache)

Функционал:
- Скачивание файлов из Google Drive
- Парсинг прайсов от поставщиков
- Кэширование наименований (name_cache.xlsx)
- Генерация прайс-листов
- Загрузка в PostgreSQL
- Уведомления в Telegram
"""

import pandas as pd
import os
import sys
import io
import json
import requests
from typing import Dict, List, Tuple, Optional
from datetime import datetime

# Google Drive API
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload, MediaFileUpload

# ============================================================================
# КОНФИГУРАЦИЯ
# ============================================================================

# Google Drive
GOOGLE_DRIVE_FOLDER_ID = "1oxEm8YySlfqXVQOptkOc0_Eoq3WJWL06"
CREDENTIALS_FILE = os.path.join(os.path.dirname(__file__), "google_credentials.json")

# Telegram
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "8579599270:AAE7-Ote1J1xlOKbkzF19eX4PmTTsl_ZU8I")
TELEGRAM_CHAT_IDS = os.environ.get("TELEGRAM_CHAT_IDS", "272265312").split(",")

# Директории
INPUT_DIR = "input"
OUTPUT_DIR = "output"

# Нужные бренды из Euroelectric.xlsx
ALLOWED_BRANDS = [
    'AirRoxy',
    'Bticino',
    'CHINT',
    'DKC',
    'IEK',
    'Jung',
    'Legrand',
    'OBO Bettermann',
    'Schneider Electric'
]

# Файлы для скачивания из Google Drive
DRIVE_FILES = {
    'Euroelectric.xlsx': None,
    'Axima_price.xlsx': None,
    'ostatki_Euroelectric.xlsx': None,
    'dostupnost_Euroelectric.xlsx': None,
    'settings.xlsx': None,
    'name_cache.xlsx': None,
}

# ============================================================================
# TELEGRAM УВЕДОМЛЕНИЯ
# ============================================================================

def send_telegram_message(message: str, parse_mode: str = "HTML"):
    """Отправляет сообщение в Telegram"""
    if not TELEGRAM_BOT_TOKEN:
        print("⚠️ TELEGRAM_BOT_TOKEN не указан, уведомления отключены")
        return
    
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    
    for chat_id in TELEGRAM_CHAT_IDS:
        chat_id = chat_id.strip()
        if not chat_id:
            continue
        try:
            response = requests.post(url, json={
                "chat_id": chat_id,
                "text": message,
                "parse_mode": parse_mode
            }, timeout=10)
            if response.status_code == 200:
                print(f"  📱 Telegram: сообщение отправлено в {chat_id}")
            else:
                print(f"  ⚠️ Telegram ошибка: {response.text}")
        except Exception as e:
            print(f"  ⚠️ Telegram ошибка: {e}")


def notify_start():
    """Уведомление о начале сборки"""
    send_telegram_message("🚀 <b>Сборка прайса запущена</b>\n\nСкачиваю файлы из Google Drive...")


def notify_success(total_products: int, duration: float):
    """Уведомление об успешной сборке"""
    message = f"""✅ <b>Сборка завершена успешно!</b>

📊 Загружено товаров: <b>{total_products:,}</b>
⏱ Время сборки: <b>{duration:.1f} сек</b>
🕐 {datetime.now().strftime('%d.%m.%Y %H:%M')}"""
    send_telegram_message(message)


def notify_error(error: str):
    """Уведомление об ошибке"""
    message = f"""❌ <b>Ошибка сборки!</b>

<code>{error[:500]}</code>

🕐 {datetime.now().strftime('%d.%m.%Y %H:%M')}"""
    send_telegram_message(message)


# ============================================================================
# GOOGLE DRIVE
# ============================================================================

def get_drive_service(readonly: bool = True):
    """Создает сервис Google Drive API"""
    # Используем полный доступ к Drive для возможности создания файлов
    scopes = ['https://www.googleapis.com/auth/drive']
    
    # Проверяем наличие credentials
    creds_json = os.environ.get("GOOGLE_CREDENTIALS_JSON")
    
    if creds_json:
        # Credentials из переменной окружения (для GitHub Actions)
        creds_dict = json.loads(creds_json)
        credentials = service_account.Credentials.from_service_account_info(
            creds_dict,
            scopes=scopes
        )
    elif os.path.exists(CREDENTIALS_FILE):
        # Credentials из файла (для локального запуска)
        credentials = service_account.Credentials.from_service_account_file(
            CREDENTIALS_FILE,
            scopes=scopes
        )
    else:
        raise FileNotFoundError(
            f"❌ Credentials не найдены!\n"
            f"Укажите GOOGLE_CREDENTIALS_JSON или создайте {CREDENTIALS_FILE}"
        )
    
    return build('drive', 'v3', credentials=credentials)


def list_drive_files(service) -> Dict[str, str]:
    """Получает список файлов в папке Google Drive"""
    results = service.files().list(
        q=f"'{GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed=false",
        fields="files(id, name, mimeType, modifiedTime)"
    ).execute()
    
    files = {}
    for f in results.get('files', []):
        files[f['name']] = f['id']
        print(f"  📄 {f['name']}")
    
    return files


def download_file_from_drive(service, file_id: str, file_name: str) -> bytes:
    """Скачивает файл из Google Drive"""
    request = service.files().get_media(fileId=file_id)
    file_buffer = io.BytesIO()
    downloader = MediaIoBaseDownload(file_buffer, request)
    
    done = False
    while not done:
        status, done = downloader.next_chunk()
    
    file_buffer.seek(0)
    return file_buffer.read()


def download_all_files_from_drive() -> bool:
    """Скачивает все необходимые файлы из Google Drive"""
    print("\n📥 Скачивание файлов из Google Drive...")
    
    try:
        service = get_drive_service()
        drive_files = list_drive_files(service)
        
        os.makedirs(INPUT_DIR, exist_ok=True)
        
        for file_name in DRIVE_FILES.keys():
            if file_name in drive_files:
                file_id = drive_files[file_name]
                content = download_file_from_drive(service, file_id, file_name)
                
                local_path = os.path.join(INPUT_DIR, file_name)
                with open(local_path, 'wb') as f:
                    f.write(content)
                
                print(f"  ✅ {file_name} ({len(content) / 1024:.1f} KB)")
            else:
                if file_name != 'name_cache.xlsx':  # name_cache может не существовать
                    print(f"  ⚠️ {file_name} не найден в Google Drive")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка при скачивании из Google Drive: {e}")
        return False


def upload_file_to_drive(local_path: str, drive_filename: str) -> Optional[str]:
    """Загружает файл на Google Drive"""
    print(f"\n📤 Загрузка {drive_filename} на Google Drive...")
    
    try:
        service = get_drive_service(readonly=False)
        
        file_metadata = {
            'name': drive_filename,
            'parents': [GOOGLE_DRIVE_FOLDER_ID]
        }
        
        media = MediaFileUpload(
            local_path,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            resumable=True
        )
        
        # Проверяем, существует ли файл с таким именем
        results = service.files().list(
            q=f"name='{drive_filename}' and '{GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed=false",
            fields="files(id)"
        ).execute()
        
        existing_files = results.get('files', [])
        
        if existing_files:
            # Обновляем существующий файл
            file_id = existing_files[0]['id']
            file = service.files().update(
                fileId=file_id,
                media_body=media
            ).execute()
            print(f"  ✅ Файл обновлён: {drive_filename}")
        else:
            # Создаём новый файл
            file = service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id'
            ).execute()
            print(f"  ✅ Файл создан: {drive_filename}")
        
        return file.get('id')
        
    except Exception as e:
        print(f"  ⚠️ Ошибка загрузки на Drive: {e}")
        return None


def send_telegram_file(file_path: str, caption: str = ""):
    """Отправляет файл в Telegram"""
    if not TELEGRAM_BOT_TOKEN:
        print("  ⚠️ TELEGRAM_BOT_TOKEN не указан")
        return
    
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendDocument"
    
    for chat_id in TELEGRAM_CHAT_IDS:
        chat_id = chat_id.strip()
        if not chat_id:
            continue
        try:
            with open(file_path, 'rb') as f:
                response = requests.post(
                    url,
                    data={
                        "chat_id": chat_id,
                        "caption": caption,
                        "parse_mode": "HTML"
                    },
                    files={"document": f},
                    timeout=120
                )
            if response.status_code == 200:
                print(f"  📱 Telegram: файл отправлен в {chat_id}")
            else:
                print(f"  ⚠️ Telegram ошибка: {response.text}")
        except Exception as e:
            print(f"  ⚠️ Telegram ошибка: {e}")


# ============================================================================
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ============================================================================

def clean(x):
    """Очистка строковых значений"""
    if isinstance(x, str):
        return x.strip()
    return x


def safe_float(x):
    """Безопасное преобразование в float"""
    try:
        if pd.isna(x):
            return None
        return float(x)
    except:
        return None


# ============================================================================
# КЭШ НАИМЕНОВАНИЙ
# ============================================================================

def load_name_cache() -> Dict[str, str]:
    """Загружает кэш наименований из name_cache.xlsx"""
    cache_file = os.path.join(INPUT_DIR, "name_cache.xlsx")
    cache = {}
    
    if not os.path.exists(cache_file):
        print("  ℹ️ Файл name_cache.xlsx не найден, кэш пустой")
        return cache
    
    try:
        df = pd.read_excel(cache_file)
        
        # Ищем колонки с артикулом и наименованием
        article_col = None
        name_col = None
        
        for col in df.columns:
            col_lower = str(col).lower()
            if 'артикул' in col_lower or 'article' in col_lower:
                article_col = col
            elif 'наименование' in col_lower or 'name' in col_lower or 'название' in col_lower:
                name_col = col
        
        if article_col is None or name_col is None:
            print(f"  ⚠️ В name_cache.xlsx не найдены колонки Артикул/Наименование")
            print(f"     Найденные колонки: {list(df.columns)}")
            return cache
        
        for _, row in df.iterrows():
            article = row[article_col]
            name = row[name_col]
            
            if pd.notna(article) and pd.notna(name):
                article_key = str(article).strip().lower()
                cache[article_key] = str(name).strip()
        
        print(f"  📚 Загружено {len(cache)} наименований из кэша")
        
    except Exception as e:
        print(f"  ⚠️ Ошибка при чтении name_cache.xlsx: {e}")
    
    return cache


# ============================================================================
# ЗАГРУЗКА НАСТРОЕК
# ============================================================================

def load_settings() -> Tuple[Dict, Dict]:
    """Загружает настройки из settings.xlsx"""
    settings_file = os.path.join(INPUT_DIR, "settings.xlsx")
    
    if not os.path.exists(settings_file):
        raise FileNotFoundError(
            f"❌ Файл {settings_file} не найден!\n"
            "Создайте файл с настройками в папке input/"
        )
    
    # Загружаем глобальные настройки
    settings_raw = pd.read_excel(settings_file, sheet_name='Settings')
    settings_dict = {}
    for _, row in settings_raw.iterrows():
        param = row['parameter']
        value = row['value']
        settings_dict[param] = value
    
    # Загружаем маржу
    margins_by_mfr = pd.read_excel(settings_file, sheet_name='Margins_by_Manufacturer')
    margins_by_art = pd.read_excel(settings_file, sheet_name='Margins_by_Article')
    
    margins_dict = {
        'global_margin': settings_dict.get('global_margin', 0.6),
        'by_manufacturer': {},
        'by_article': {}
    }
    
    for _, row in margins_by_mfr.iterrows():
        if not pd.isna(row['manufacturer']) and not pd.isna(row['margin']):
            margins_dict['by_manufacturer'][row['manufacturer']] = float(row['margin'])
    
    for _, row in margins_by_art.iterrows():
        if not pd.isna(row['article']) and not pd.isna(row['margin']):
            margins_dict['by_article'][str(row['article'])] = float(row['margin'])
    
    return settings_dict, margins_dict


def validate_settings(settings_dict: Dict):
    """Проверяет обязательные параметры"""
    required = ['kurs', 'global_margin']
    
    for param in required:
        if param not in settings_dict or pd.isna(settings_dict[param]):
            raise ValueError(
                f"❌ Обязательный параметр '{param}' не указан в settings.xlsx!"
            )
    
    print("✅ Все обязательные параметры заполнены")


# ============================================================================
# ЗАГРУЗКА ОСТАТКОВ
# ============================================================================

def load_stock() -> Tuple[Dict, Dict]:
    """Загружает остатки из Алматы и Астаны"""
    almaty_file = os.path.join(INPUT_DIR, "ostatki_Euroelectric.xlsx")
    astana_file = os.path.join(INPUT_DIR, "dostupnost_Euroelectric.xlsx")
    
    almaty_stock = {}
    astana_stock = {}
    
    if os.path.exists(almaty_file):
        df = pd.read_excel(almaty_file, header=None)
        for i in range(12, len(df)):
            row = df.iloc[i]
            if len(row) > 10:
                article = clean(row.iloc[0])
                if isinstance(article, str):
                    article = article.lower()
                qty = safe_float(row.iloc[10])
                if article and qty is not None and qty > 0:
                    almaty_stock[article] = almaty_stock.get(article, 0) + qty
        print(f"  📦 Алматы: загружено {len(almaty_stock)} позиций")
    else:
        print(f"  ⚠️ Файл {almaty_file} не найден")
    
    if os.path.exists(astana_file):
        df = pd.read_excel(astana_file, header=None)
        for i in range(8, len(df)):
            row = df.iloc[i]
            if len(row) > 7:
                article = clean(row.iloc[0])
                if isinstance(article, str):
                    article = article.lower()
                qty = safe_float(row.iloc[7])
                if article and qty is not None and qty > 0:
                    astana_stock[article] = astana_stock.get(article, 0) + qty
        print(f"  📦 Астана: загружено {len(astana_stock)} позиций")
    else:
        print(f"  ⚠️ Файл {astana_file} не найден")
    
    return almaty_stock, astana_stock


def determine_lead_time(article: str, almaty: Dict, astana: Dict) -> str:
    """Определяет срок доставки по наличию"""
    astana_qty = astana.get(article, 0)
    almaty_qty = almaty.get(article, 0)
    
    if astana_qty > 0:
        return "6-10 дней"
    if almaty_qty > 0:
        return "10-14 дней"
    return "по запросу"


# ============================================================================
# ПАРСИНГ EUROELECTRIC
# ============================================================================

def parse_euroelectric(almaty: Dict, astana: Dict, name_cache: Dict) -> List[Dict]:
    """Парсит единый файл Euroelectric.xlsx с использованием кэша наименований"""
    main_file = os.path.join(INPUT_DIR, "Euroelectric.xlsx")
    
    if not os.path.exists(main_file):
        print(f"⚠️ Файл {main_file} не найден, пропускаем EuroElectric")
        return []
    
    df = pd.read_excel(main_file)
    all_products = []
    brand_counts = {}
    cache_hits = 0
    missing_names = 0
    
    for i, row in df.iterrows():
        brand = clean(row.iloc[4]) if len(row) > 4 else None
        
        if not brand or brand not in ALLOWED_BRANDS:
            continue
        
        article_raw = clean(row.iloc[0]) if len(row) > 0 else None
        name = clean(row.iloc[1]) if len(row) > 1 else None
        rrc = safe_float(row.iloc[3]) if len(row) > 3 else None
        
        if not article_raw or rrc is None or rrc <= 0:
            continue
        
        article = article_raw.lower() if isinstance(article_raw, str) else str(article_raw).lower()
        
        # Проверяем кэш если наименование пустое
        if not name or pd.isna(name) or str(name).strip() == '':
            cached_name = name_cache.get(article)
            if cached_name:
                name = cached_name
                cache_hits += 1
            else:
                name = f"[{article_raw}]"  # Временное название
                missing_names += 1
        
        dealer_price_kzt = round(rrc * 0.6, 2)
        lead_time = determine_lead_time(article, almaty, astana)
        
        all_products.append({
            'manufacturer': brand,
            'article': article,
            'name': name,
            'dealer_price_kzt': dealer_price_kzt,
            'srok': lead_time,
            'catalog_url': '',
            'image_url': ''
        })
        
        brand_counts[brand] = brand_counts.get(brand, 0) + 1
    
    print(f"  📋 Всего товаров EuroElectric: {len(all_products)}")
    print(f"  📚 Из кэша: {cache_hits} | Без наименования: {missing_names}")
    for brand in sorted(brand_counts.keys()):
        print(f"     • {brand}: {brand_counts[brand]}")
    
    return all_products


# ============================================================================
# ПАРСИНГ AXIMA (WAGO)
# ============================================================================

def parse_axima() -> List[Dict]:
    """Парсит прайс Axima (Wago)"""
    axima_file = os.path.join(INPUT_DIR, "Axima_price.xlsx")
    
    if not os.path.exists(axima_file):
        print(f"⚠️ Файл {axima_file} не найден, пропускаем Axima")
        return []
    
    df = pd.read_excel(axima_file, header=None)
    products = []
    
    for i in range(3, len(df)):
        row = df.iloc[i]
        
        article = clean(row.iloc[0]) if len(row) > 0 else None
        name = clean(row.iloc[7]) if len(row) > 7 else None
        price = safe_float(row.iloc[13]) if len(row) > 13 else None
        
        if not article or not name or price is None or price <= 0:
            continue
        
        products.append({
            'manufacturer': 'Wago',
            'article': article,
            'name': name,
            'dealer_price_kzt': price,
            'srok': '10-14 дней',
            'catalog_url': '',
            'image_url': ''
        })
    
    print(f"  ✅ Wago: {len(products)} товаров")
    return products


# ============================================================================
# ГЕНЕРАЦИЯ EXCEL ФАЙЛОВ
# ============================================================================

def generate_internal(products: List[Dict]) -> Tuple[str, str]:
    """Генерирует внутренний прайс с дилерскими ценами
    
    Returns:
        (local_path, filename_with_date)
    """
    df = pd.DataFrame(products)
    df = df.sort_values(['manufacturer', 'article'])
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Имя файла с датой
    date_str = datetime.now().strftime('%Y-%m-%d')
    filename = f"INTERNAL_{date_str}.xlsx"
    output_path = os.path.join(OUTPUT_DIR, filename)
    
    df.to_excel(output_path, index=False)
    
    print(f"✅ {filename} создан ({len(df)} товаров)")
    return output_path, filename


def get_margin(article: str, manufacturer: str, margins_dict: Dict) -> float:
    """Возвращает маржу с учетом приоритета"""
    if article in margins_dict['by_article']:
        return margins_dict['by_article'][article]
    if manufacturer in margins_dict['by_manufacturer']:
        return margins_dict['by_manufacturer'][manufacturer]
    return margins_dict['global_margin']


def calculate_client_price(dealer_price_kzt: float, article: str, manufacturer: str,
                          kurs: float, margins_dict: Dict) -> int:
    """Рассчитывает клиентскую цену в рублях"""
    margin = get_margin(article, manufacturer, margins_dict)
    client_price_rub = (dealer_price_kzt * (1 + margin)) / kurs
    return round(client_price_rub)


def generate_public(products: List[Dict], settings_dict: Dict, margins_dict: Dict) -> Tuple[pd.DataFrame, str]:
    """Генерирует клиентский прайс с финальными ценами в рублях"""
    kurs = settings_dict['kurs']
    
    public_data = []
    for p in products:
        client_price = calculate_client_price(
            p['dealer_price_kzt'],
            p['article'],
            p['manufacturer'],
            kurs,
            margins_dict
        )
        
        public_data.append({
            'Производитель': p['manufacturer'],
            'Артикул': p['article'],
            'Наименование': p['name'],
            'Цена, руб': client_price,
            'Срок поставки': p['srok'],
            'catalog_url': p['catalog_url'],
            'image_url': p['image_url']
        })
    
    df = pd.DataFrame(public_data)
    df = df.sort_values(['Производитель', 'Артикул'])
    
    output_path = os.path.join(OUTPUT_DIR, "PUBLIC.xlsx")
    df.to_excel(output_path, index=False)
    
    print(f"✅ PUBLIC.xlsx создан ({len(df)} товаров)")
    return df, output_path


# ============================================================================
# ЗАГРУЗКА В POSTGRESQL
# ============================================================================

def upload_to_postgresql(products: List[Dict], settings_dict: Dict, 
                         almaty_stock: Dict, astana_stock: Dict, 
                         margins_dict: Dict) -> bool:
    """Загружает данные в PostgreSQL для веб-приложения"""
    try:
        import psycopg2
        from psycopg2.extras import execute_values
    except ImportError:
        print("❌ Библиотека psycopg2 не установлена!")
        return False
    
    database_url = os.environ.get('DATABASE_URL') or settings_dict.get('database_url')
    
    if not database_url:
        print("❌ DATABASE_URL не указан!")
        return False
    
    print("\n🔄 Загрузка в PostgreSQL...")
    
    try:
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()
        
        kurs = settings_dict.get('kurs', 5)
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                manufacturer VARCHAR(255) NOT NULL,
                article VARCHAR(255) NOT NULL,
                name TEXT NOT NULL,
                price_rub INTEGER NOT NULL,
                lead_time_default VARCHAR(50),
                astana_qty INTEGER DEFAULT 0,
                almaty_qty INTEGER DEFAULT 0,
                catalog_url TEXT,
                image_url TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cur.execute("CREATE INDEX IF NOT EXISTS idx_products_manufacturer ON products(manufacturer)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_products_article ON products(article)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_products_manufacturer_article ON products(manufacturer, article)")
        
        cur.execute("TRUNCATE TABLE products RESTART IDENTITY")
        print("  🗑️ Таблица products очищена")
        
        insert_data = []
        for p in products:
            article = p['article'].lower() if isinstance(p['article'], str) else str(p['article'])
            
            margin = get_margin(article, p['manufacturer'], margins_dict)
            price_rub = round((p['dealer_price_kzt'] * (1 + margin)) / kurs)
            
            astana_qty = int(astana_stock.get(article, 0))
            almaty_qty = int(almaty_stock.get(article, 0))
            lead_time = p.get('srok') or determine_lead_time(article, almaty_stock, astana_stock)
            
            insert_data.append((
                p['manufacturer'],
                article,
                p['name'],
                price_rub,
                lead_time,
                astana_qty,
                almaty_qty,
                p.get('catalog_url', ''),
                p.get('image_url', '')
            ))
        
        insert_query = """
            INSERT INTO products 
            (manufacturer, article, name, price_rub, lead_time_default, 
             astana_qty, almaty_qty, catalog_url, image_url)
            VALUES %s
        """
        
        execute_values(cur, insert_query, insert_data, page_size=500)
        conn.commit()
        
        cur.execute("SELECT COUNT(*) FROM products")
        count = cur.fetchone()[0]
        
        cur.close()
        conn.close()
        
        print(f"  ✅ Загружено {count} товаров")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка PostgreSQL: {e}")
        return False


# ============================================================================
# ГЛАВНАЯ ФУНКЦИЯ
# ============================================================================

def main():
    """Основная функция"""
    import time
    start_time = time.time()
    
    print("=" * 70)
    print("🚀 PRICE SYSTEM v5.0 (Google Drive + Telegram + Name Cache)")
    print("=" * 70)
    
    # Определяем режим работы
    use_google_drive = os.environ.get('USE_GOOGLE_DRIVE', 'true').lower() == 'true'
    
    try:
        # Уведомление о старте
        notify_start()
        
        # 1. Скачивание файлов из Google Drive (если включено)
        if use_google_drive:
            if not download_all_files_from_drive():
                raise Exception("Не удалось скачать файлы из Google Drive")
        else:
            print("\n📂 Используем локальные файлы из папки input/")
        
        # 2. Загрузка кэша наименований
        print("\n📚 Загрузка кэша наименований...")
        name_cache = load_name_cache()
        
        # 3. Загрузка настроек
        print("\n📋 Загрузка настроек...")
        settings_dict, margins_dict = load_settings()
        validate_settings(settings_dict)
        
        # 4. Загрузка остатков
        print("\n📦 Загрузка остатков...")
        almaty_stock, astana_stock = load_stock()
        
        # 5. Парсинг EuroElectric
        print("\n🔍 Парсинг EuroElectric...")
        euro_products = parse_euroelectric(almaty_stock, astana_stock, name_cache)
        
        # 6. Парсинг Axima (Wago)
        print("\n🔍 Парсинг Axima (Wago)...")
        wago_products = parse_axima()
        
        # 7. Объединение всех товаров
        all_products = euro_products + wago_products
        print(f"\n📊 Всего товаров: {len(all_products)}")
        
        if len(all_products) == 0:
            raise Exception("Нет товаров для обработки!")
        
        # 8. Генерация Excel файла (только INTERNAL с датой)
        print("\n💾 Генерация Excel файла...")
        internal_path, internal_filename = generate_internal(all_products)
        
        # 9. Загрузка в PostgreSQL
        print("\n🐘 Загрузка в PostgreSQL...")
        success = upload_to_postgresql(all_products, settings_dict, almaty_stock, astana_stock, margins_dict)
        
        # 10. Загрузка INTERNAL на Google Drive (без даты, чтобы можно было обновлять)
        if use_google_drive:
            upload_file_to_drive(internal_path, "INTERNAL.xlsx")
        
        # Подсчет времени
        duration = time.time() - start_time
        
        print("\n" + "=" * 70)
        print("✅ ВСЕ ГОТОВО!")
        print(f"⏱ Время выполнения: {duration:.1f} сек")
        print("=" * 70)
        
        # 11. Отправка файла и уведомления в Telegram
        if success:
            caption = f"""✅ <b>Сборка завершена!</b>

📊 Товаров: <b>{len(all_products):,}</b>
⏱ Время: <b>{duration:.1f} сек</b>
🕐 {datetime.now().strftime('%d.%m.%Y %H:%M')}"""
            
            send_telegram_file(internal_path, caption)
        
    except Exception as e:
        print(f"\n❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        
        # Уведомление об ошибке
        notify_error(str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()
