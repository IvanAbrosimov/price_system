import { describe, it, expect } from 'vitest'
import { getDynamicLeadTime, formatPrice, getLeadTimeClass, formatTotal } from '../utils/leadTime'

describe('getDynamicLeadTime', () => {
  it('достаточно в Астане → 6-10 дней (fast)', () => {
    const result = getDynamicLeadTime(14, 2, 14)
    expect(result.text).toBe('6-10 дней')
    expect(result.type).toBe('fast')
  })

  it('точно хватает в Астане → 6-10 дней', () => {
    const result = getDynamicLeadTime(10, 5, 10)
    expect(result.text).toBe('6-10 дней')
    expect(result.type).toBe('fast')
  })

  it('меньше чем в Астане → 6-10 дней', () => {
    const result = getDynamicLeadTime(20, 10, 5)
    expect(result.text).toBe('6-10 дней')
    expect(result.type).toBe('fast')
  })

  it('не хватает в Астане, но суммарно хватает → 10-14 дней (medium)', () => {
    const result = getDynamicLeadTime(14, 2, 15)
    expect(result.text).toBe('10-14 дней')
    expect(result.type).toBe('medium')
  })

  it('точно хватает суммарно → 10-14 дней', () => {
    const result = getDynamicLeadTime(14, 2, 16)
    expect(result.text).toBe('10-14 дней')
    expect(result.type).toBe('medium')
  })

  it('суммарно не хватает → по запросу (slow)', () => {
    const result = getDynamicLeadTime(14, 2, 17)
    expect(result.text).toBe('по запросу')
    expect(result.type).toBe('slow')
  })

  it('нули на складах → по запросу', () => {
    const result = getDynamicLeadTime(0, 0, 1)
    expect(result.text).toBe('по запросу')
    expect(result.type).toBe('slow')
  })

  it('заказ 0, есть на складе Астана → 6-10 дней (дефолт)', () => {
    const result = getDynamicLeadTime(10, 10, 0)
    expect(result.text).toBe('6-10 дней')
    expect(result.type).toBe('fast')
  })

  it('заказ 0, нет в Астане, есть в Алматы → 10-14 дней', () => {
    const result = getDynamicLeadTime(0, 10, 0)
    expect(result.text).toBe('10-14 дней')
    expect(result.type).toBe('medium')
  })

  it('заказ 0, нет нигде → по запросу', () => {
    const result = getDynamicLeadTime(0, 0, 0)
    expect(result.text).toBe('по запросу')
    expect(result.type).toBe('slow')
  })

  it('большой заказ при маленьком остатке → по запросу', () => {
    const result = getDynamicLeadTime(5, 3, 100)
    expect(result.text).toBe('по запросу')
    expect(result.type).toBe('slow')
  })

  // Граничные случаи из ТЗ
  describe('Примеры из ТЗ', () => {
    // | LS1520  | 14     | 2      | 14    | 6-10 дней |
    it('LS1520: Астана=14, Алматы=2, Заказ=14 → 6-10 дней', () => {
      const result = getDynamicLeadTime(14, 2, 14)
      expect(result.text).toBe('6-10 дней')
    })

    // | LS1520  | 14     | 2      | 15    | 10-14 дней |
    it('LS1520: Астана=14, Алматы=2, Заказ=15 → 10-14 дней', () => {
      const result = getDynamicLeadTime(14, 2, 15)
      expect(result.text).toBe('10-14 дней')
    })

    // | LS1520  | 14     | 2      | 17    | по запросу |
    it('LS1520: Астана=14, Алматы=2, Заказ=17 → по запросу', () => {
      const result = getDynamicLeadTime(14, 2, 17)
      expect(result.text).toBe('по запросу')
    })
  })
})

describe('getLeadTimeClass', () => {
  it('fast → cell-lead-time fast', () => {
    expect(getLeadTimeClass('fast')).toBe('cell-lead-time fast')
  })

  it('medium → cell-lead-time medium', () => {
    expect(getLeadTimeClass('medium')).toBe('cell-lead-time medium')
  })

  it('slow → cell-lead-time slow', () => {
    expect(getLeadTimeClass('slow')).toBe('cell-lead-time slow')
  })
})

describe('formatPrice', () => {
  it('форматирует число', () => {
    // toLocaleString может использовать разные разделители
    const result = formatPrice(1920)
    expect(result).toContain('1')
    expect(result).toContain('920')
  })

  it('форматирует большие числа', () => {
    const result = formatPrice(1234567)
    expect(result).toContain('234')
    expect(result).toContain('567')
  })

  it('форматирует маленькие числа', () => {
    expect(formatPrice(999)).toBe('999')
  })

  it('форматирует ноль', () => {
    expect(formatPrice(0)).toBe('0')
  })
})

describe('formatTotal', () => {
  it('вычисляет и форматирует сумму', () => {
    const result = formatTotal(1920, 5)
    // 1920 * 5 = 9600
    expect(result).toContain('9')
    expect(result).toContain('600')
  })

  it('возвращает 0 при quantity = 0', () => {
    expect(formatTotal(1920, 0)).toBe('0')
  })
})
