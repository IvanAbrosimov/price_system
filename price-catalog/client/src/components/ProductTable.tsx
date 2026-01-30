import { memo } from 'react'
import { Product } from '../types'
import { getDynamicLeadTime, getLeadTimeClass, formatPrice } from '../utils/leadTime'
import QuantityInput from './QuantityInput'

interface ProductTableProps {
  products: Product[]
  cart: {
    getQuantity: (article: string) => number
    addItem: (product: Product, quantity: number) => void
    updateQuantity: (article: string, quantity: number, product?: Product) => void
  }
  hasMore: boolean
  loadMore: () => void
  loadingMore: boolean
}

// Мемоизированная строка товара для производительности
const ProductRow = memo(({ 
  product, 
  cart
}: { 
  product: Product
  cart: ProductTableProps['cart']
}) => {
  const quantity = cart.getQuantity(product.article)
  
  const leadTime = getDynamicLeadTime(
    product.astanaQty || 0,
    product.almatyQty || 0,
    quantity
  )

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity > 0) {
      cart.addItem(product, newQuantity)
    } else {
      cart.updateQuantity(product.article, 0, product)
    }
  }

  return (
    <tr className={quantity > 0 ? 'has-quantity' : ''}>
      <td className="cell-manufacturer">{product.manufacturer}</td>
      <td className="cell-article">{product.article}</td>
      <td className="cell-name" title={product.name}>{product.name}</td>
      <td className="cell-price price-format">{formatPrice(product.priceRub)} ₽</td>
      <td className={`cell-lead-time ${getLeadTimeClass(leadTime.type)}`}>
        {leadTime.text}
      </td>
      <td className="cell-quantity">
        <QuantityInput
          value={quantity}
          onChange={handleQuantityChange}
          article={product.article}
        />
      </td>
    </tr>
  )
})

ProductRow.displayName = 'ProductRow'

export default function ProductTable({ 
  products, 
  cart, 
  hasMore, 
  loadMore, 
  loadingMore 
}: ProductTableProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">Товары не найдены</p>
        <p className="text-sm mt-2">Попробуйте изменить параметры поиска</p>
      </div>
    )
  }

  return (
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
          {products.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              cart={cart}
            />
          ))}
        </tbody>
      </table>
      
      {/* Кнопка "Загрузить ещё" */}
      {hasMore && (
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
  )
}
