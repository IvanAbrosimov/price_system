import { useState, useCallback, useEffect } from 'react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  totalProducts: number
}

export default function SearchBar({ value, onChange, totalProducts }: SearchBarProps) {
  const [inputValue, setInputValue] = useState(value)

  // Debounce для поиска
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(inputValue)
    }, 300)

    return () => clearTimeout(timer)
  }, [inputValue, onChange])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }, [])

  const handleClear = useCallback(() => {
    setInputValue('')
    onChange('')
  }, [onChange])

  return (
    <div className="search-container">
      <div className="relative flex-1 max-w-md">
        <input
          type="text"
          className="search-input w-full pl-10"
          placeholder="Поиск по артикулу или названию..."
          value={inputValue}
          onChange={handleChange}
          aria-label="Поиск товаров"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          🔍
        </span>
        {inputValue && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onClick={handleClear}
            aria-label="Очистить поиск"
          >
            ✕
          </button>
        )}
      </div>
      <div className="text-sm text-gray-500">
        Найдено: <span className="font-medium">{totalProducts}</span> товаров
      </div>
    </div>
  )
}
