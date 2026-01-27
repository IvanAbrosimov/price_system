interface CartButtonProps {
  itemsCount: number
  onClick: () => void
}

export default function CartButton({ itemsCount, onClick }: CartButtonProps) {
  return (
    <button
      className="cart-button"
      onClick={onClick}
      aria-label="Корзина"
    >
      <span className="text-2xl">🛒</span>
      {itemsCount > 0 && (
        <span className="cart-badge">{itemsCount}</span>
      )}
    </button>
  )
}
