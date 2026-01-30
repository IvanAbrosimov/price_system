/**
 * Главный компонент приложения - стиль Google Sheets с группировкой
 */

import { useState, useMemo } from 'react'
import { useProducts, useManufacturers } from './hooks/useProducts'
import { useCart } from './hooks/useCart'
import { getDynamicLeadTime, getLeadTimeClass, formatPrice } from './utils/leadTime'
import { Product, MANUFACTURER_GROUPS } from './types'
import CartDrawer from './components/CartDrawer'
import QuantityInput from './components/QuantityInput'

export default function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('Все')
  const [isCartOpen, setIsCartOpen] = useState(false)
  
  // Состояние схлопывания групп производителей
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    Object.keys(MANUFACTURER_GROUPS).forEach(manufacturer => {
      initial[manufacturer] = true // По умолчанию свёрнуто
    })
    return initial
  })
  
  // Загрузка товаров с пагинацией
  const { 
    products, 
    loading, 
    loadingMore,
    total, 
    hasMore, 
    loadMore 
  } = useProducts({
    manufacturer: activeTab === 'Все' ? undefined : activeTab,
    search: searchQuery
  })
  
  // Загрузка производителей с количеством товаров
  const { manufacturers } = useManufacturers()
  
  const cartHook = useCart()
  const { items, addItem, updateQuantity, getQuantity, getTotal, getItemsCount, removeItem, clear } = cartHook

  // Группировка товаров по производителю для вкладки "Все"
  const groupedProducts = useMemo(() => {
    if (activeTab !== 'Все') return null
    
    const groups: Record<string, Product[]> = {}
    
    products.forEach(product => {
      const manufacturerGroup = findManufacturerGroup(product.manufacturer)
      if (!groups[manufacturerGroup]) {
        groups[manufacturerGroup] = []
      }
      groups[manufacturerGroup].push(product)
    })
    
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))
  }, [products, activeTab])

  // Обработчик изменения количества
  const handleQuantityChange = (product: Product, newQty: number) => {
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

  // Формируем список вкладок
  const tabs = ['Все', ...manufacturers.map(m => m.name)]

  return (
    <div className="app-container">
      {/* Верхняя панель */}
      <div className="header-bar">
        <div className="header-left">
          <span className="header-title">📊 Прайс-каталог</span>
          <span className="header-count">
            Найдено: {total.toLocaleString('ru-RU')} товаров
            {products.length < total && ` (загружено ${products.length.toLocaleString('ru-RU')})`}
          </span>
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
                    onQuantityChange={handleQuantityChange}
                  />
                ))
              )}
            </tbody>
          </table>
          
          {/* Кнопка "Загрузить ещё" */}
          {hasMore && !loading && (
            <div className="load-more-container">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="load-more-btn"
              >
                {loadingMore ? (
                  <>
                    <span className="loading-spinner-small"></span>
                    Загрузка...
                  </>
                ) : (
                  'Загрузить ещё'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Табы листов - внизу как в Google Sheets */}
        <div className="tabs-bar">
          {tabs.map((tab) => {
            const manufacturerInfo = manufacturers.find(m => m.name === tab)
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`tab-item ${activeTab === tab ? 'active' : ''}`}
              >
                {tab}
                {manufacturerInfo && (
                  <span className="tab-count">({manufacturerInfo.count.toLocaleString('ru-RU')})</span>
                )}
              </button>
            )
          })}
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
 * Находит группу производителя по имени
 */
function findManufacturerGroup(productManufacturer: string): string {
  const normalizedProduct = productManufacturer.toLowerCase()
  
  for (const [group, lines] of Object.entries(MANUFACTURER_GROUPS)) {
    for (const line of lines) {
      if (normalizedProduct.includes(line.toLowerCase()) || line.toLowerCase().includes(normalizedProduct)) {
        return group
      }
    }
    if (normalizedProduct.includes(group.toLowerCase()) || group.toLowerCase().includes(normalizedProduct)) {
      return group
    }
  }
  
  return productManufacturer
}

// Компонент строк группы производителя
interface ManufacturerGroupRowsProps {
  manufacturer: string
  products: Product[]
  isCollapsed: boolean
  onToggle: () => void
  getQuantity: (article: string) => number
  onQuantityChange: (product: Product, qty: number) => void
}

function ManufacturerGroupRows({
  manufacturer,
  products,
  isCollapsed,
  onToggle,
  getQuantity,
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
          onQuantityChange={onQuantityChange}
        />
      ))}
    </>
  )
}

// Компонент строки товара
interface ProductRowProps {
  product: Product
  isEven: boolean
  quantity: number
  onQuantityChange: (product: Product, qty: number) => void
}

function ProductRow({ product, isEven, quantity, onQuantityChange }: ProductRowProps) {
  const leadTime = getDynamicLeadTime(
    product.astanaQty || 0,
    product.almatyQty || 0,
    quantity
  )
  
  return (
    <tr className={`product-row ${isEven ? 'even' : 'odd'} ${quantity > 0 ? 'has-quantity' : ''}`}>
      <td className="cell-manufacturer">{product.manufacturer}</td>
      <td className="cell-article">{product.article}</td>
      <td className="cell-name" title={product.name}>{product.name}</td>
      <td className="cell-price">{formatPrice(product.priceRub)} ₽</td>
      <td className={`cell-lead-time ${getLeadTimeClass(leadTime.type)}`}>{leadTime.text}</td>
      <td className="cell-quantity">
        <QuantityInput
          value={quantity}
          onChange={(newQty) => onQuantityChange(product, newQty)}
          article={product.article}
        />
      </td>
    </tr>
  )
}
