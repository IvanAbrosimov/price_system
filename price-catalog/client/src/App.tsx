/**
 * Главный компонент приложения - стиль Google Sheets с lazy loading
 */

import { useState } from 'react'
import { useProducts, useManufacturers, useManufacturerProducts } from './hooks/useProducts'
import { useCart } from './hooks/useCart'
import { getDynamicLeadTime, getLeadTimeClass, formatPrice } from './utils/leadTime'
import { Product } from './types'
import CartDrawer from './components/CartDrawer'
import QuantityInput from './components/QuantityInput'

export default function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('Все')
  const [isCartOpen, setIsCartOpen] = useState(false)
  
  // Состояние раскрытых групп производителей (true = развёрнуто)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  
  // Загрузка производителей с количеством товаров
  const { manufacturers, loading: manufacturersLoading } = useManufacturers()
  
  // Загрузка товаров (только для вкладок производителей и поиска)
  const { 
    products, 
    loading: productsLoading, 
    loadingMore,
    total, 
    hasMore, 
    loadMore 
  } = useProducts({
    manufacturer: activeTab === 'Все' ? undefined : activeTab,
    search: searchQuery
  })
  
  const cartHook = useCart()
  const { items, addItem, getQuantity, getTotal, getItemsCount, removeItem, clear } = cartHook

  // Обработчик изменения количества
  const handleQuantityChange = (product: Product, newQty: number) => {
    if (newQty > 0) {
      addItem(product, newQty)
    } else {
      removeItem(product.article)
    }
  }

  // Переключение раскрытия группы
  const toggleGroup = (manufacturer: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [manufacturer]: !prev[manufacturer]
    }))
  }

  // Развернуть/свернуть все группы
  const toggleAllGroups = (expand: boolean) => {
    const newState: Record<string, boolean> = {}
    manufacturers.forEach(m => {
      newState[m.name] = expand
    })
    setExpandedGroups(newState)
  }

  // Формируем список вкладок
  const tabs = ['Все', ...manufacturers.map(m => m.name)]
  
  // Общее количество товаров
  const totalProducts = activeTab === 'Все' 
    ? manufacturers.reduce((sum, m) => sum + m.count, 0)
    : total

  // Показываем вкладку "Все" или поиск?
  const showAllTab = activeTab === 'Все' && !searchQuery
  const loading = showAllTab ? manufacturersLoading : productsLoading

  return (
    <div className="app-container">
      {/* Верхняя панель */}
      <div className="header-bar">
        <div className="header-left">
          <span className="header-title">📊 Прайс-каталог</span>
          <span className="header-count">
            Всего: {totalProducts.toLocaleString('ru-RU')} товаров
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
        {/* Кнопки развернуть/свернуть все (только на вкладке "Все" без поиска) */}
        {showAllTab && !loading && manufacturers.length > 0 && (
          <div className="collapse-controls">
            <button 
              onClick={() => toggleAllGroups(true)}
              className="collapse-btn"
            >
              ▼ Развернуть все
            </button>
            <button 
              onClick={() => toggleAllGroups(false)}
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
              ) : showAllTab ? (
                // Вкладка "Все" - lazy loading групп
                manufacturers.map((mfr) => (
                  <LazyManufacturerGroup
                    key={mfr.name}
                    manufacturer={mfr.name}
                    count={mfr.count}
                    isExpanded={expandedGroups[mfr.name] === true} // по умолчанию свёрнуто
                    onToggle={() => toggleGroup(mfr.name)}
                    getQuantity={getQuantity}
                    onQuantityChange={handleQuantityChange}
                  />
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    Товары не найдены
                  </td>
                </tr>
              ) : (
                // Вкладки производителей или поиск - обычная таблица
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
          
          {/* Кнопка "Загрузить ещё" (только для вкладок производителей/поиска) */}
          {!showAllTab && hasMore && !loading && (
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

// Компонент группы с lazy loading
interface LazyManufacturerGroupProps {
  manufacturer: string
  count: number
  isExpanded: boolean
  onToggle: () => void
  getQuantity: (article: string) => number
  onQuantityChange: (product: Product, qty: number) => void
}

function LazyManufacturerGroup({
  manufacturer,
  count,
  isExpanded,
  onToggle,
  getQuantity,
  onQuantityChange
}: LazyManufacturerGroupProps) {
  // Lazy loading - загружаем только когда группа раскрыта
  const { products, loading, loadingMore, hasMore, loadMore, loaded } = 
    useManufacturerProducts(manufacturer, isExpanded)

  return (
    <>
      {/* Строка-заголовок группы */}
      <tr className="group-header-row" onClick={onToggle}>
        <td colSpan={6}>
          <div className="group-header-content">
            <span className={`group-arrow ${isExpanded ? 'expanded' : ''}`}>
              ▶
            </span>
            <span className="group-name">{manufacturer}</span>
            <span className="group-count">({count.toLocaleString('ru-RU')} товаров)</span>
            {isExpanded && loading && (
              <span className="loading-spinner-small ml-2"></span>
            )}
          </div>
        </td>
      </tr>
      
      {/* Строки товаров (если развёрнуто) */}
      {isExpanded && loaded && products.map((product, idx) => (
        <ProductRow
          key={product.id}
          product={product}
          isEven={idx % 2 === 0}
          quantity={getQuantity(product.article)}
          onQuantityChange={onQuantityChange}
        />
      ))}
      
      {/* Кнопка "Загрузить ещё" внутри группы */}
      {isExpanded && loaded && hasMore && (
        <tr className="load-more-row">
          <td colSpan={6}>
            <button
              onClick={(e) => { e.stopPropagation(); loadMore(); }}
              disabled={loadingMore}
              className="load-more-btn-inline"
            >
              {loadingMore ? 'Загрузка...' : `Загрузить ещё (${manufacturer})`}
            </button>
          </td>
        </tr>
      )}
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
    quantity,
    product.leadTimeDefault || undefined
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
