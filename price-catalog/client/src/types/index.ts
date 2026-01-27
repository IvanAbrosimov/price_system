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
export const MANUFACTURER_GROUPS: Record<string, string[]> = {
  'Air roxy': ['Air roxy'],
  'Chint': ['Chint', 'Щиты Chint'],
  'DKC': ['DKC'],
  'Jung': ['ls990', 'eco profi'],
  'Legrand': ['bticino', 'valena', 'suno', 'niloe step', 'Niloe(Этика)', 'asfora', 'unica'],
  'Merten': ['merten'],
  'Practibox S': ['Щиты Practibox S'],
  'Schneider Electric': ['Easy9', 'Resi9', 'Щиты SE', 'Rx3'],
  'Wago': ['Wago']
}

// Список групп для вкладок
export const MANUFACTURER_TABS = ['Все', ...Object.keys(MANUFACTURER_GROUPS)]
