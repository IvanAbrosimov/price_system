import { CartItem } from '../types'
import { formatPrice } from '../utils/leadTime'
import { exportCartToExcel } from '../utils/exportExcel'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
  cart: {
    items: CartItem[]
    getTotal: () => number
    getItemsCount: () => number
    removeItem: (article: string) => void
    clear: () => void
  }
}

export default function CartDrawer({ isOpen, onClose, cart }: CartDrawerProps) {
  const { items, getTotal, removeItem, clear } = cart
  const total = getTotal()

  if (!isOpen) return null

  const handleExport = () => {
    exportCartToExcel(items, 'Заказ')
  }

  return (
    <>
      {/* Overlay */}
      <div 
        className="cart-overlay" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer */}
      <div className="cart-drawer-container">
        {/* Header */}
        <div className="cart-header">
          <h2 className="text-lg font-bold flex items-center gap-2">
            🛒 Корзина
            {items.length > 0 && (
              <span className="text-sm font-normal text-gray-500">
                ({items.length} {getItemWord(items.length)})
              </span>
            )}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl p-1"
            aria-label="Закрыть корзину"
          >
            ✕
          </button>
        </div>

        {/* Content с полноценным скроллом */}
        <div className="cart-content-scroll">
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-4xl mb-2">🛒</p>
              <p>Корзина пуста</p>
              <p className="text-sm mt-2">Добавьте товары из каталога</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <CartItemCard
                  key={item.article}
                  item={item}
                  onRemove={() => removeItem(item.article)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="cart-footer">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-600">Итого:</span>
              <span className="cart-total price-format">{formatPrice(total)} ₽</span>
            </div>
            
            {/* Кнопки действий */}
            <div className="flex flex-col gap-2">
              {/* Кнопка выгрузки в Excel */}
              <button 
                className="btn btn-export w-full flex items-center justify-center gap-2"
                onClick={handleExport}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                  />
                </svg>
                Выгрузить в Excel
              </button>
              
              {/* Очистить и Оформить */}
              <div className="flex gap-2">
                <button 
                  className="btn btn-secondary flex-1"
                  onClick={clear}
                >
                  Очистить
                </button>
                <button 
                  className="btn btn-primary flex-1"
                  onClick={() => alert('Функция заказа будет реализована позже')}
                >
                  Оформить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

interface CartItemCardProps {
  item: CartItem
  onRemove: () => void
}

function CartItemCard({ item, onRemove }: CartItemCardProps) {
  const itemTotal = item.priceRub * item.quantity

  return (
    <div className="cart-item">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <p className="cart-item-name">{item.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {item.manufacturer} · {item.article}
          </p>
        </div>
        <button 
          onClick={onRemove}
          className="ml-2 text-gray-400 hover:text-red-500 p-1"
          aria-label={`Удалить ${item.article}`}
        >
          ✕
        </button>
      </div>
      <div className="cart-item-details">
        <span>{formatPrice(item.priceRub)} ₽ × {item.quantity}</span>
        <span className="font-medium">{formatPrice(itemTotal)} ₽</span>
      </div>
      <div className="text-xs text-gray-500 mt-1">
        Срок: <span className={getLeadTimeColor(item.leadTime)}>{item.leadTime}</span>
      </div>
    </div>
  )
}

/**
 * Склонение слова "позиция"
 */
function getItemWord(count: number): string {
  const lastDigit = count % 10
  const lastTwoDigits = count % 100
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'позиций'
  }
  
  if (lastDigit === 1) {
    return 'позиция'
  }
  
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'позиции'
  }
  
  return 'позиций'
}

/**
 * Цвет для срока поставки
 */
function getLeadTimeColor(leadTime: string): string {
  if (leadTime === 'по запросу') {
    return 'text-red-600'
  }
  if (leadTime === '6-10 дней') {
    return 'text-green-600'
  }
  return 'text-orange-600'
}
