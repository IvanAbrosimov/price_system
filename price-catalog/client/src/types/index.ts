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
// Каждая группа содержит название производителя + его линейки для фильтрации
export const MANUFACTURER_GROUPS: Record<string, string[]> = {
  'Air roxy': ['Air roxy', 'air roxy'],
  'Chint': ['Chint', 'chint', 'Щиты Chint'],
  'DKC': ['DKC', 'dkc'],
  'Jung': ['Jung', 'jung', 'ls990', 'LS990', 'LS 990', 'eco profi', 'Eco Profi'],
  'Legrand': ['Legrand', 'legrand', 'bticino', 'Bticino', 'valena', 'Valena', 'suno', 'Suno', 'niloe step', 'Niloe Step', 'Niloe(Этика)', 'asfora', 'Asfora', 'unica', 'Unica'],
  'Merten': ['Merten', 'merten'],
  'Practibox S': ['Practibox S', 'Practibox', 'practibox', 'Щиты Practibox S'],
  'Schneider Electric': ['Schneider Electric', 'Schneider', 'schneider', 'Easy9', 'easy9', 'Resi9', 'resi9', 'Щиты SE', 'Rx3', 'rx3'],
  'Wago': ['Wago', 'wago', 'WAGO']
}

// Список групп для вкладок
export const MANUFACTURER_TABS = ['Все', ...Object.keys(MANUFACTURER_GROUPS)]
