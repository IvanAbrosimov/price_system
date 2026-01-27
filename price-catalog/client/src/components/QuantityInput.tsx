import { useState, useCallback } from 'react'

interface QuantityInputProps {
  value: number
  onChange: (value: number) => void
  article: string
  min?: number
  max?: number
}

export default function QuantityInput({
  value,
  onChange,
  article,
  min = 0,
  max = 9999
}: QuantityInputProps) {
  const [inputValue, setInputValue] = useState(value > 0 ? String(value) : '')

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value

    // Разрешаем пустое значение
    if (rawValue === '') {
      setInputValue('')
      onChange(0)
      return
    }

    // Парсим число
    const numValue = parseInt(rawValue, 10)
    
    if (isNaN(numValue)) return
    
    // Проверяем границы
    const clampedValue = Math.max(min, Math.min(max, numValue))
    
    setInputValue(String(clampedValue))
    onChange(clampedValue)
  }, [onChange, min, max])

  const handleBlur = useCallback(() => {
    // При потере фокуса, если поле пустое - оставляем пустым
    if (inputValue === '' || inputValue === '0') {
      setInputValue('')
      onChange(0)
    }
  }, [inputValue, onChange])

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    // Выделяем весь текст при фокусе
    e.target.select()
  }, [])

  return (
    <input
      type="number"
      className="quantity-input"
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder="0"
      min={min}
      max={max}
      data-article={article}
      aria-label={`Количество для ${article}`}
    />
  )
}
