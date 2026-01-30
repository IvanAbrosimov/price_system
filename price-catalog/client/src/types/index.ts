/**
 * Типы данных для прайс-каталога
 */

// Товар из API
export interface Product {
  id: number
  manufacturer: string
  article: string
  name: string
  priceRub: number
  leadTimeDefault: string | null
  astanaQty: number | null
  almatyQty: number | null
  catalogUrl: string | null
  imageUrl: string | null
  updatedAt: string | null
}

// Ответ API списка товаров
export interface ProductsResponse {
  products: Product[]
  total: number
}

// Ответ API производителей
export interface ManufacturersResponse {
  manufacturers: string[]
}

// Остатки товара
export interface Stock {
  astana: number
  almaty: number
}

// Элемент корзины
export interface CartItem {
  article: string
  manufacturer: string
  name: string
  priceRub: number
  quantity: number
  leadTime: string
  astanaQty: number
  almatyQty: number
}

// Состояние корзины
export interface CartState {
  items: Record<string, CartItem>
  lastUpdated: string
}

// Группы производителей для вкладок
// Каждая группа содержит название производителя + его варианты написания для фильтрации
export const MANUFACTURER_GROUPS: Record<string, string[]> = {
  'AirRoxy': ['AirRoxy', 'Air Roxy', 'air roxy', 'airroxy'],
  'Bticino': ['Bticino', 'bticino', 'BTICINO'],
  'CHINT': ['CHINT', 'Chint', 'chint'],
  'DKC': ['DKC', 'dkc'],
  'IEK': ['IEK', 'iek', 'Iek'],
  'Jung': ['Jung', 'jung', 'JUNG'],
  'Legrand': ['Legrand', 'legrand', 'LEGRAND'],
  'OBO Bettermann': ['OBO Bettermann', 'OBO', 'obo', 'Obo Bettermann'],
  'Schneider Electric': ['Schneider Electric', 'Schneider', 'schneider', 'SCHNEIDER ELECTRIC'],
  'Wago': ['Wago', 'wago', 'WAGO']
}

// Список групп для вкладок
export const MANUFACTURER_TABS = ['Все', ...Object.keys(MANUFACTURER_GROUPS)]
