"""
Price System - Автоматизированная система генерации прайс-листов
Версия: 3.0 (PostgreSQL only)

Функционал:
- Парсинг прайсов от поставщиков EuroElectric и Axima
- Генерация внутреннего прайса (INTERNAL.xlsx)
- Генерация клиентского прайса (PUBLIC.xlsx)
- Загрузка в PostgreSQL для веб-приложения
"""

import pandas as pd
import os
import sys
from typing import Dict, List, Tuple

# ============================================================================
# КОНСТАНТЫ
# ============================================================================

INPUT_DIR = "input"
OUTPUT_DIR = "output"

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
# ЗАГРУЗКА НАСТРОЕК
# ============================================================================

def load_settings() -> Tuple[pd.DataFrame, Dict, Dict]:
    """
    Загружает все настройки из settings.xlsx
    
    Returns:
        (config_df, settings_dict, margins_dict)
    """
    settings_file = os.path.join(INPUT_DIR, "settings.xlsx")
    
    if not os.path.exists(settings_file):
        raise FileNotFoundError(
            f"❌ Файл {settings_file} не найден!\n"
            "Создайте файл с настройками в папке input/"
        )
    
    # Загружаем конфигурацию листов
    config_df = pd.read_excel(settings_file, sheet_name='Config')
    
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
    
    # Заполняем маржу по производителям
    for _, row in margins_by_mfr.iterrows():
        if not pd.isna(row['manufacturer']) and not pd.isna(row['margin']):
            margins_dict['by_manufacturer'][row['manufacturer']] = float(row['margin'])
    
    # Заполняем маржу по артикулам
    for _, row in margins_by_art.iterrows():
        if not pd.isna(row['article']) and not pd.isna(row['margin']):
            margins_dict['by_article'][str(row['article'])] = float(row['margin'])
    
    return config_df, settings_dict, margins_dict


def validate_settings(settings_dict: Dict):
    """Проверяет обязательные параметры"""
    required = ['kurs', 'global_margin']
    
    for param in required:
        if param not in settings_dict or pd.isna(settings_dict[param]):
            raise ValueError(
                f"❌ Обязательный параметр '{param}' не указан в settings.xlsx!\n"
                f"Откройте input/settings.xlsx и заполните лист 'Settings'"
            )
    
    print("✅ Все обязательные параметры заполнены")


# ============================================================================
# ЗАГРУЗКА ОСТАТКОВ
# ============================================================================

def load_stock() -> Tuple[Dict, Dict]:
    """
    Загружает остатки из Алматы и Астаны
    
    Returns:
        (almaty_stock, astana_stock) - словари {article: qty}
    """
    almaty_file = os.path.join(INPUT_DIR, "ostatki_Euroelectric.xlsx")
    astana_file = os.path.join(INPUT_DIR, "dostupnost_Euroelectric.xlsx")
    
    almaty_stock = {}
    astana_stock = {}
    
    # Загружаем Алматы
    if os.path.exists(almaty_file):
        df = pd.read_excel(almaty_file, header=None)
        for i in range(12, len(df)):
            row = df.iloc[i]
            if len(row) > 7:
                article = clean(row.iloc[0])
                if isinstance(article, str):
                    article = article.lower()
                qty = safe_float(row.iloc[7])
                if article and qty is not None and qty > 0:
                    almaty_stock[article] = almaty_stock.get(article, 0) + qty
    
    # Загружаем Астану
    if os.path.exists(astana_file):
        df = pd.read_excel(astana_file, header=None)
        for i in range(11, len(df)):
            row = df.iloc[i]
            if len(row) > 7:
                article = clean(row.iloc[0])
                if isinstance(article, str):
                    article = article.lower()
                qty = safe_float(row.iloc[7])
                if article and qty is not None and qty > 0:
                    astana_stock[article] = astana_stock.get(article, 0) + qty
    
    print(f"📦 Загружено остатков: Алматы={len(almaty_stock)}, Астана={len(astana_stock)}")
    return almaty_stock, astana_stock


def determine_lead_time(article: str, almaty: Dict, astana: Dict) -> str:
    """
    Определяет срок доставки по наличию
    
    ЛОГИКА:
    1. Если есть в Астане → "6-10 дней"
    2. Если есть в Алматы → "10-14 дней"
    3. Нигде нет → "по запросу"
    """
    astana_qty = astana.get(article, 0)
    almaty_qty = almaty.get(article, 0)
    
    if astana_qty > 0:
        return "6-10 дней"
    
    if (astana_qty + almaty_qty) > 0:
        return "10-14 дней"
    
    return "по запросу"


# ============================================================================
# ПАРСИНГ EUROELECTRIC
# ============================================================================

def parse_euroelectric(config_df: pd.DataFrame, almaty: Dict, astana: Dict) -> List[Dict]:
    """Парсит все листы EuroElectric согласно конфигурации"""
    main_file = os.path.join(INPUT_DIR, "all_Euroelectric.xlsx")
    
    if not os.path.exists(main_file):
        print(f"⚠️ Файл {main_file} не найден, пропускаем EuroElectric")
        return []
    
    xls = pd.ExcelFile(main_file)
    all_products = []
    
    for _, cfg in config_df.iterrows():
        sheet_name = cfg['sheet_name']
        manufacturer = cfg['manufacturer']
        start_row = int(cfg['start_row'])
        col_article = int(cfg['col_article'])
        col_name = int(cfg['col_name'])
        col_price = int(cfg['col_price'])
        
        if sheet_name not in xls.sheet_names:
            print(f"  ⚠️ Лист '{sheet_name}' не найден, пропускаем")
            continue
        
        df = pd.read_excel(main_file, sheet_name=sheet_name, header=None)
        parsed_count = 0
        
        for i in range(start_row - 1, len(df)):
            row = df.iloc[i]
            
            article_raw = clean(row.iloc[col_article - 1]) if col_article <= len(row) else None
            name = clean(row.iloc[col_name - 1]) if col_name <= len(row) else None
            rrc = safe_float(row.iloc[col_price - 1]) if col_price <= len(row) else None
            
            if not article_raw or not name or rrc is None or rrc <= 0:
                continue
            
            article = article_raw.lower() if isinstance(article_raw, str) else str(article_raw)
            dealer_price_kzt = round(rrc * 0.6, 2)
            lead_time = determine_lead_time(article, almaty, astana)
            
            all_products.append({
                'manufacturer': manufacturer,
                'article': article,
                'name': name,
                'dealer_price_kzt': dealer_price_kzt,
                'srok': lead_time,
                'catalog_url': '',
                'image_url': ''
            })
            parsed_count += 1
        
        print(f"  ✅ {sheet_name}: {parsed_count} товаров")
    
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

def generate_internal(products: List[Dict]) -> str:
    """Генерирует внутренний прайс с дилерскими ценами"""
    df = pd.DataFrame(products)
    df = df.sort_values(['manufacturer', 'article'])
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output_path = os.path.join(OUTPUT_DIR, "INTERNAL.xlsx")
    df.to_excel(output_path, index=False)
    
    print(f"✅ INTERNAL.xlsx создан ({len(df)} товаров)")
    return output_path


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
        print("Установите: pip3 install psycopg2-binary")
        return False
    
    database_url = os.environ.get('DATABASE_URL') or settings_dict.get('database_url')
    
    if not database_url:
        print("❌ DATABASE_URL не указан!")
        print("Укажите в переменных окружения или в settings.xlsx (параметр database_url)")
        return False
    
    print("\n🔄 Загрузка в PostgreSQL...")
    
    try:
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()
        
        kurs = settings_dict.get('kurs', 5)
        
        # Создаем таблицу если не существует
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
        
        # Очищаем старые данные
        cur.execute("TRUNCATE TABLE products RESTART IDENTITY")
        print("  🗑️ Таблица products очищена")
        
        insert_data = []
        for p in products:
            article = p['article'].lower() if isinstance(p['article'], str) else str(p['article'])
            
            margin = get_margin(article, p['manufacturer'], margins_dict)
            price_rub = round((p['dealer_price_kzt'] * (1 + margin)) / kurs)
            
            astana_qty = int(astana_stock.get(article, 0))
            almaty_qty = int(almaty_stock.get(article, 0))
            lead_time = determine_lead_time(article, almaty_stock, astana_stock)
            
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
        
        cur.execute("SELECT COUNT(DISTINCT manufacturer) FROM products")
        mfr_count = cur.fetchone()[0]
        
        cur.close()
        conn.close()
        
        print(f"  ✅ Загружено {count} товаров от {mfr_count} производителей")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка при загрузке в PostgreSQL: {e}")
        import traceback
        traceback.print_exc()
        return False


# ============================================================================
# ГЛАВНАЯ ФУНКЦИЯ
# ============================================================================

def main():
    """
    Основная функция
    
    Использование:
        python3 build.py    # Парсинг файлов и загрузка в PostgreSQL
    """
    print("=" * 70)
    print("🚀 PRICE SYSTEM - Генерация прайс-листов (v3.0)")
    print("=" * 70)
    
    try:
        # 1. Загрузка настроек
        print("\n📋 Загрузка настроек...")
        config_df, settings_dict, margins_dict = load_settings()
        validate_settings(settings_dict)
        
        # 2. Загрузка остатков
        print("\n📦 Загрузка остатков...")
        almaty_stock, astana_stock = load_stock()
        
        # 3. Парсинг EuroElectric
        print("\n🔍 Парсинг EuroElectric...")
        euro_products = parse_euroelectric(config_df, almaty_stock, astana_stock)
        
        # 4. Парсинг Axima (Wago)
        print("\n🔍 Парсинг Axima (Wago)...")
        wago_products = parse_axima()
        
        # 5. Объединение всех товаров
        all_products = euro_products + wago_products
        print(f"\n📊 Всего товаров: {len(all_products)}")
        
        if len(all_products) == 0:
            print("⚠️ Нет товаров для обработки!")
            return
        
        # 6. Генерация Excel файлов
        print("\n💾 Генерация Excel файлов...")
        generate_internal(all_products)
        generate_public(all_products, settings_dict, margins_dict)
        
        # 7. Загрузка в PostgreSQL
        print("\n🐘 Загрузка в PostgreSQL...")
        success = upload_to_postgresql(all_products, settings_dict, almaty_stock, astana_stock, margins_dict)
        
        print("\n" + "=" * 70)
        print("✅ ВСЕ ГОТОВО!")
        print("=" * 70)
        print(f"\nФайлы созданы в папке: {OUTPUT_DIR}/")
        print("- INTERNAL.xlsx (для вас)")
        print("- PUBLIC.xlsx (для клиентов)")
        
        if success:
            print("\n🌐 Данные загружены в PostgreSQL")
            print("   Сайт готов к работе!")
        else:
            print("\n⚠️ Данные НЕ загружены в PostgreSQL")
            print("   Укажите DATABASE_URL и перезапустите")
        
    except Exception as e:
        print(f"\n❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
