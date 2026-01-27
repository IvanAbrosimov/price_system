import { useMemo } from 'react'
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
}

export default function ProductTable({ products, cart }: ProductTableProps) {
  // Группировка товаров по производителю
  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {}
    
    products.forEach(product => {
      const key = product.manufacturer
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(product)
    })
    
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))
  }, [products])

  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">Товары не найдены</p>
        <p className="text-sm mt-2">Попробуйте изменить параметры поиска</p>
      </div>
    )
  }

  return (
    <div className="table-container">
      <table className="product-table">
        <thead>
          <tr>
            <th style={{ width: '130px' }}>Производитель</th>
            <th style={{ width: '120px' }}>Артикул</th>
            <th style={{ minWidth: '300px' }}>Наименование</th>
            <th style={{ width: '100px' }}>Цена, ₽</th>
            <th style={{ width: '120px' }}>Срок</th>
            <th style={{ width: '100px' }}>Кол-во</th>
          </tr>
        </thead>
        <tbody>
          {groupedProducts.map(([manufacturer, items]) => (
            <ManufacturerGroup
              key={manufacturer}
              manufacturer={manufacturer}
              products={items}
              cart={cart}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface ManufacturerGroupProps {
  manufacturer: string
  products: Product[]
  cart: ProductTableProps['cart']
}

function ManufacturerGroup({ manufacturer: _manufacturer, products, cart }: ManufacturerGroupProps) {
  return (
    <>
      {products.map(product => (
        <ProductRow
          key={product.id}
          product={product}
          cart={cart}
        />
      ))}
    </>
  )
}

interface ProductRowProps {
  product: Product
  cart: ProductTableProps['cart']
}

function ProductRow({ product, cart }: ProductRowProps) {
  const quantity = cart.getQuantity(product.article)
  
  // Рассчитываем динамический срок на основе количества
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
      <td className="text-center text-sm">{product.manufacturer}</td>
      <td className="cell-article">{product.article}</td>
      <td className="cell-name" title={product.name}>{product.name}</td>
      <td className="cell-price price-format">{formatPrice(product.priceRub)} ₽</td>
      <td className={getLeadTimeClass(leadTime.type)}>{leadTime.text}</td>
      <td>
        <QuantityInput
          value={quantity}
          onChange={handleQuantityChange}
          article={product.article}
        />
      </td>
    </tr>
  )
}
