/**
 * Главный компонент приложения - стиль Google Sheets
 */

import { useState, useMemo } from 'react'
import { useProducts } from './hooks/useProducts'
import { useCart } from './hooks/useCart'
import { getDynamicLeadTime } from './utils/leadTime'
import { MANUFACTURER_GROUPS } from './types'
import CartDrawer from './components/CartDrawer'

// 9 производителей для вкладок
const MANUFACTURER_TABS = ['Все', ...Object.keys(MANUFACTURER_GROUPS)]

export default function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('Все')
  const [isCartOpen, setIsCartOpen] = useState(false)
  // Состояние схлопывания групп производителей (ключ - название производителя)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    // По умолчанию все группы свёрнуты
    const initial: Record<string, boolean> = {}
    Object.keys(MANUFACTURER_GROUPS).forEach(manufacturer => {
      initial[manufacturer] = true // true = свёрнуто
    })
    return initial
  })
  
  const { products, loading, total } = useProducts({
    manufacturer: activeTab === 'Все' ? undefined : activeTab,
    search: searchQuery
  })
  const cartHook = useCart()
  const { items, addItem, getQuantity, getTotal, getItemsCount, removeItem, clear } = cartHook

  // Группировка товаров по производителю для вкладки "Все"
  const groupedProducts = useMemo(() => {
    if (activeTab !== 'Все') {
      return null // На конкретных вкладках не группируем
    }
    
    const groups: Record<string, typeof products> = {}
    
    products.forEach(product => {
      // Определяем группу производителя
      const manufacturerGroup = findManufacturerGroup(product.manufacturer)
      if (!groups[manufacturerGroup]) {
        groups[manufacturerGroup] = []
      }
      groups[manufacturerGroup].push(product)
    })
    
    // Сортируем по имени производителя
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))
  }, [products, activeTab])

  // Расчёт динамического срока для каждого товара
  const getLeadTime = (astanaQty: number, almatyQty: number, qty: number) => {
    const result = getDynamicLeadTime(astanaQty, almatyQty, qty)
    return result.text
  }

  // Обработчик изменения количества
  const handleQuantityChange = (product: typeof products[0], newQty: number) => {
    if (newQty > 0) {
      addItem(product, newQty)
    } else {
      removeItem(product.article)
    }
  }

  // Переключение схлопывания группы
  const toggleGroup = (manufacturer: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [manufacturer]: !prev[manufacturer]
    }))
  }

  // Развернуть/свернуть все группы
  const toggleAllGroups = (collapse: boolean) => {
    const newState: Record<string, boolean> = {}
    Object.keys(MANUFACTURER_GROUPS).forEach(manufacturer => {
      newState[manufacturer] = collapse
    })
    setCollapsedGroups(newState)
  }

  return (
    <div className="app-container">
      {/* Верхняя панель */}
      <div className="header-bar">
        <div className="header-left">
          <span className="header-title">📊 Прайс-каталог</span>
          <span className="header-count">Найдено: {total} товаров</span>
        </div>
        
        {/* Кнопка корзины */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="cart-button-main"
        >
          🛒 Корзина
          {getItemsCount() > 0 && (
            <span className="cart-count-badge">
              {getItemsCount()}
            </span>
          )}
        </button>
      </div>

      {/* Строка поиска */}
      <div className="search-bar">
        <div className="search-icon">🔍</div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по артикулу или наименованию..."
          className="search-input-field"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="search-clear"
          >
            ✕
          </button>
        )}
      </div>

      {/* Основное содержимое */}
      <div className="main-content">
        {/* Кнопки развернуть/свернуть все (только на вкладке "Все") */}
        {activeTab === 'Все' && !loading && products.length > 0 && (
          <div className="collapse-controls">
            <button 
              onClick={() => toggleAllGroups(false)}
              className="collapse-btn"
            >
              ▼ Развернуть все
            </button>
            <button 
              onClick={() => toggleAllGroups(true)}
              className="collapse-btn"
            >
              ▶ Свернуть все
            </button>
          </div>
        )}

        {/* Таблица */}
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th className="col-manufacturer">Производитель</th>
                <th className="col-article">Артикул</th>
                <th className="col-name">Наименование</th>
                <th className="col-price">Цена, ₽</th>
                <th className="col-lead-time">Срок</th>
                <th className="col-quantity">Кол-во</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="loading-cell">
                    <div className="loading-spinner-small"></div>
                    Загрузка...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    Товары не найдены
                  </td>
                </tr>
              ) : activeTab === 'Все' && groupedProducts ? (
                // Отображение с группировкой по производителям
                groupedProducts.map(([manufacturer, manufacturerProducts]) => (
                  <ManufacturerGroupRows
                    key={manufacturer}
                    manufacturer={manufacturer}
                    products={manufacturerProducts}
                    isCollapsed={collapsedGroups[manufacturer] ?? true}
                    onToggle={() => toggleGroup(manufacturer)}
                    getQuantity={getQuantity}
                    getLeadTime={getLeadTime}
                    onQuantityChange={handleQuantityChange}
                  />
                ))
              ) : (
                // Обычное отображение без группировки (на вкладках конкретных производителей)
                products.map((product, idx) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    isEven={idx % 2 === 0}
                    quantity={getQuantity(product.article)}
                    leadTime={getLeadTime(product.astanaQty || 0, product.almatyQty || 0, getQuantity(product.article))}
                    onQuantityChange={handleQuantityChange}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Табы листов - внизу как в Google Sheets */}
        <div className="tabs-bar">
          {MANUFACTURER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`tab-item ${activeTab === tab ? 'active' : ''}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Корзина */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={{
          items,
          getTotal,
          getItemsCount,
          removeItem,
          clear
        }}
      />
    </div>
  )
}

/**
 * Находит группу производителя по имени (из линейки)
 */
function findManufacturerGroup(productManufacturer: string): string {
  const normalizedProduct = productManufacturer.toLowerCase()
  
  for (const [group, lines] of Object.entries(MANUFACTURER_GROUPS)) {
    for (const line of lines) {
      if (normalizedProduct.includes(line.toLowerCase()) || line.toLowerCase().includes(normalizedProduct)) {
        return group
      }
    }
    // Также проверяем совпадение с названием самой группы
    if (normalizedProduct.includes(group.toLowerCase()) || group.toLowerCase().includes(normalizedProduct)) {
      return group
    }
  }
  
  // Если не нашли - возвращаем как есть
  return productManufacturer
}

// Компонент строк группы производителя
interface ManufacturerGroupRowsProps {
  manufacturer: string
  products: Array<{
    id: number
    manufacturer: string
    article: string
    name: string
    priceRub: number
    astanaQty: number | null
    almatyQty: number | null
  }>
  isCollapsed: boolean
  onToggle: () => void
  getQuantity: (article: string) => number
  getLeadTime: (astanaQty: number, almatyQty: number, qty: number) => string
  onQuantityChange: (product: any, qty: number) => void
}

function ManufacturerGroupRows({
  manufacturer,
  products,
  isCollapsed,
  onToggle,
  getQuantity,
  getLeadTime,
  onQuantityChange
}: ManufacturerGroupRowsProps) {
  return (
    <>
      {/* Строка-заголовок группы */}
      <tr className="group-header-row" onClick={onToggle}>
        <td colSpan={6}>
          <div className="group-header-content">
            <span className={`group-arrow ${isCollapsed ? '' : 'expanded'}`}>
              ▶
            </span>
            <span className="group-name">{manufacturer}</span>
            <span className="group-count">({products.length} товаров)</span>
          </div>
        </td>
      </tr>
      
      {/* Строки товаров (если не свёрнуто) */}
      {!isCollapsed && products.map((product, idx) => (
        <ProductRow
          key={product.id}
          product={product}
          isEven={idx % 2 === 0}
          quantity={getQuantity(product.article)}
          leadTime={getLeadTime(product.astanaQty || 0, product.almatyQty || 0, getQuantity(product.article))}
          onQuantityChange={onQuantityChange}
        />
      ))}
    </>
  )
}

// Компонент строки товара
interface ProductRowProps {
  product: {
    id: number
    manufacturer: string
    article: string
    name: string
    priceRub: number
    astanaQty: number | null
    almatyQty: number | null
  }
  isEven: boolean
  quantity: number
  leadTime: string
  onQuantityChange: (product: any, qty: number) => void
}

function ProductRow({ product, isEven, quantity, leadTime, onQuantityChange }: ProductRowProps) {
  return (
    <tr className={`product-row ${isEven ? 'even' : 'odd'} ${quantity > 0 ? 'has-quantity' : ''}`}>
      <td className="cell-manufacturer">{product.manufacturer}</td>
      <td className="cell-article">{product.article}</td>
      <td className="cell-name" title={product.name}>{product.name}</td>
      <td className="cell-price">{product.priceRub.toLocaleString('ru-RU')}</td>
      <td className={`cell-lead-time ${getLeadTimeClass(leadTime)}`}>{leadTime}</td>
      <td className="cell-quantity">
        <input
          type="number"
          min="0"
          value={quantity || ''}
          onChange={(e) => onQuantityChange(product, parseInt(e.target.value) || 0)}
          className="quantity-input-field"
          placeholder="0"
        />
      </td>
    </tr>
  )
}

function getLeadTimeClass(leadTime: string): string {
  if (leadTime === 'по запросу') return 'slow'
  if (leadTime === '6-10 дней') return 'fast'
  return 'medium'
}
