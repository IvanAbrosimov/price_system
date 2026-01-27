import { CartItem } from '../types'
import { formatPrice } from '../utils/leadTime'

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

  return (
    <>
      {/* Overlay */}
      <div 
        className="cart-overlay" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer */}
      <div className={`cart-drawer ${isOpen ? '' : 'closed'}`}>
        {/* Header */}
        <div className="cart-header">
          <h2 className="text-lg font-bold">🛒 Корзина</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
            aria-label="Закрыть корзину"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="cart-content">
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-4xl mb-2">🛒</p>
              <p>Корзина пуста</p>
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
          <p className="text-xs text-gray-500">{item.article}</p>
        </div>
        <button 
          onClick={onRemove}
          className="ml-2 text-gray-400 hover:text-red-500"
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
        Срок: {item.leadTime}
      </div>
    </div>
  )
}
