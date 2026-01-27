/**
 * Главный компонент приложения - стиль Google Sheets
 */

import { useState, useMemo } from 'react'
import { useProducts, useManufacturers } from './hooks/useProducts'
import { useCart } from './hooks/useCart'
import { getDynamicLeadTime } from './utils/leadTime'
import CartDrawer from './components/CartDrawer'

export default function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('Все')
  const [isCartOpen, setIsCartOpen] = useState(false)
  
  const { products, loading, total } = useProducts({
    manufacturer: activeTab === 'Все' ? undefined : activeTab,
    search: searchQuery
  })
  const { manufacturers } = useManufacturers()
  const cartHook = useCart()
  const { items, addItem, getQuantity, getTotal, getItemsCount, removeItem, clear } = cartHook

  // Табы: "Все" + производители
  const tabs = useMemo(() => ['Все', ...manufacturers], [manufacturers])

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

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Верхняя панель - как в Google Sheets */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-gray-300 bg-gray-50">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-600">📊 Прайс-каталог</span>
          <span className="text-xs text-gray-400">Найдено: {total} товаров</span>
        </div>
        
        {/* Кнопка корзины */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="relative flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
        >
          🛒 Корзина
          {getItemsCount() > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {getItemsCount()}
            </span>
          )}
        </button>
      </div>

      {/* Строка формул / поиска - как в Google Sheets */}
      <div className="flex items-center border-b border-gray-300 bg-gray-50">
        <div className="flex items-center px-2 py-1 border-r border-gray-300 bg-gray-100 min-w-[80px]">
          <span className="text-xs text-gray-500">🔍</span>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по артикулу или наименованию..."
          className="flex-1 px-2 py-1 text-sm border-0 focus:outline-none focus:ring-0"
        />
      </div>

      {/* Табы производителей - как листы в Google Sheets (внизу) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Таблица на весь экран */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="border-r border-gray-300 px-2 py-1 text-left font-medium text-gray-700 w-[120px]">
                  Производитель
                </th>
                <th className="border-r border-gray-300 px-2 py-1 text-left font-medium text-gray-700 w-[100px]">
                  Артикул
                </th>
                <th className="border-r border-gray-300 px-2 py-1 text-left font-medium text-gray-700">
                  Наименование
                </th>
                <th className="border-r border-gray-300 px-2 py-1 text-right font-medium text-gray-700 w-[90px]">
                  Цена, ₽
                </th>
                <th className="border-r border-gray-300 px-2 py-1 text-center font-medium text-gray-700 w-[100px]">
                  Срок
                </th>
                <th className="px-2 py-1 text-center font-medium text-gray-700 w-[80px]">
                  Кол-во
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    Загрузка...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    Товары не найдены
                  </td>
                </tr>
              ) : (
                products.map((product, idx) => {
                  const qty = getQuantity(product.article)
                  const leadTime = getLeadTime(product.astanaQty || 0, product.almatyQty || 0, qty)
                  const isEven = idx % 2 === 0
                  
                  return (
                    <tr 
                      key={product.id}
                      className={`border-b border-gray-200 hover:bg-blue-50 ${isEven ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="border-r border-gray-200 px-2 py-1 text-gray-600">
                        {product.manufacturer}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-1 font-mono text-xs text-gray-700">
                        {product.article}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-1 text-gray-800">
                        {product.name}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-1 text-right font-medium text-gray-900">
                        {product.priceRub.toLocaleString('ru-RU')}
                      </td>
                      <td className={`border-r border-gray-200 px-2 py-1 text-center text-xs ${
                        leadTime === 'по запросу' ? 'text-red-600' : 
                        leadTime === '6-10 дней' ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {leadTime}
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="number"
                          min="0"
                          value={qty || ''}
                          onChange={(e) => handleQuantityChange(product, parseInt(e.target.value) || 0)}
                          className="w-full px-1 py-0.5 text-center text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Табы листов - внизу как в Google Sheets */}
        <div className="flex items-center border-t border-gray-300 bg-gray-100 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm border-r border-gray-300 whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'bg-white text-gray-900 font-medium border-t-2 border-t-blue-500'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
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
