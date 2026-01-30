/**
 * Главный компонент приложения - Оптимизированная версия с виртуализацией
 */

import { useState } from 'react'
import { useProducts, useManufacturers } from './hooks/useProducts'
import { useCart } from './hooks/useCart'
import ProductTable from './components/ProductTable'
import CartDrawer from './components/CartDrawer'

export default function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('Все')
  const [isCartOpen, setIsCartOpen] = useState(false)
  
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
        {/* Индикатор загрузки */}
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <span>Загрузка товаров...</span>
          </div>
        ) : (
          /* Виртуализированная таблица */
          <ProductTable
            products={products}
            cart={{ getQuantity, addItem, updateQuantity }}
            hasMore={hasMore}
            loadMore={loadMore}
            loadingMore={loadingMore}
          />
        )}

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
