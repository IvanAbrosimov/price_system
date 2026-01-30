import { useCallback, useRef, memo } from 'react'
import * as ReactWindow from 'react-window'
import { Product } from '../types'
import { getDynamicLeadTime, getLeadTimeClass, formatPrice } from '../utils/leadTime'
import QuantityInput from './QuantityInput'

// Получаем FixedSizeList из react-window
const FixedSizeList = (ReactWindow as any).FixedSizeList || (ReactWindow as any).default?.FixedSizeList

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

// Высота строки
const ROW_HEIGHT = 56

// Мемоизированная строка товара
const ProductRow = memo(({ 
  product, 
  cart, 
  style 
}: { 
  product: Product
  cart: ProductTableProps['cart']
  style: React.CSSProperties
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
    <div 
      style={style} 
      className={`product-row ${quantity > 0 ? 'has-quantity' : ''}`}
    >
      <div className="product-cell cell-manufacturer">{product.manufacturer}</div>
      <div className="product-cell cell-article">{product.article}</div>
      <div className="product-cell cell-name" title={product.name}>{product.name}</div>
      <div className="product-cell cell-price price-format">{formatPrice(product.priceRub)} ₽</div>
      <div className={`product-cell cell-lead-time ${getLeadTimeClass(leadTime.type)}`}>
        {leadTime.text}
      </div>
      <div className="product-cell cell-quantity">
        <QuantityInput
          value={quantity}
          onChange={handleQuantityChange}
          article={product.article}
        />
      </div>
    </div>
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
  const listRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Обработчик скролла для infinite scroll
  const handleScroll = useCallback(({ scrollOffset, scrollDirection }: { scrollOffset: number; scrollDirection: 'forward' | 'backward' }) => {
    if (scrollDirection !== 'forward' || loadingMore || !hasMore) return
    
    const listHeight = products.length * ROW_HEIGHT
    const viewportHeight = containerRef.current?.clientHeight || 600
    const threshold = listHeight - viewportHeight - 500 // Загружаем за 500px до конца
    
    if (scrollOffset > threshold) {
      loadMore()
    }
  }, [loadingMore, hasMore, loadMore, products.length])

  // Рендер строки
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const product = products[index]
    if (!product) return null
    
    return (
      <ProductRow
        key={product.id}
        product={product}
        cart={cart}
        style={style}
      />
    )
  }, [products, cart])

  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">Товары не найдены</p>
        <p className="text-sm mt-2">Попробуйте изменить параметры поиска</p>
      </div>
    )
  }

  return (
    <div className="product-table-container" ref={containerRef}>
      {/* Заголовок таблицы */}
      <div className="product-table-header">
        <div className="product-cell cell-manufacturer">Производитель</div>
        <div className="product-cell cell-article">Артикул</div>
        <div className="product-cell cell-name">Наименование</div>
        <div className="product-cell cell-price">Цена, ₽</div>
        <div className="product-cell cell-lead-time">Срок</div>
        <div className="product-cell cell-quantity">Кол-во</div>
      </div>
      
      {/* Виртуализированный список */}
      <FixedSizeList
        ref={listRef}
        height={Math.min(products.length * ROW_HEIGHT, window.innerHeight - 280)}
        itemCount={products.length}
        itemSize={ROW_HEIGHT}
        width="100%"
        onScroll={handleScroll}
        overscanCount={10}
        className="product-list"
      >
        {Row}
      </FixedSizeList>
      
      {/* Индикатор загрузки */}
      {loadingMore && (
        <div className="loading-more">
          <div className="loading-spinner"></div>
          <span>Загрузка...</span>
        </div>
      )}
      
      {/* Информация о количестве */}
      {hasMore && !loadingMore && (
        <div className="load-more-hint">
          Прокрутите вниз для загрузки ещё товаров
        </div>
      )}
    </div>
  )
}
