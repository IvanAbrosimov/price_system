/**
 * Утилита для расчёта динамических сроков доставки
 * 
 * Логика:
 * 1. Если qty_Астана >= заказ → "6-10 дней" (быстрая доставка)
 * 2. Если (Астана + Алматы) >= заказ → "10-14 дней" (средняя)
 * 3. Иначе → "по запросу" (нужен заказ у поставщика)
 */

export type LeadTimeType = 'fast' | 'medium' | 'slow'

export interface LeadTimeResult {
  text: string
  type: LeadTimeType
}

/**
 * Рассчитывает срок доставки на основе наличия и количества заказа
 * 
 * @param astanaQty - остаток в Астане
 * @param almatyQty - остаток в Алматы
 * @param orderQty - количество заказа
 * @param defaultLeadTime - дефолтный срок из БД (для Wago и др. фиксированных поставщиков)
 */
export function getDynamicLeadTime(
  astanaQty: number,
  almatyQty: number,
  orderQty: number,
  defaultLeadTime?: string
): LeadTimeResult {
  // Если нет остатков, но есть дефолтный срок из БД (Wago и т.д.)
  const noStock = (astanaQty || 0) === 0 && (almatyQty || 0) === 0
  if (noStock && defaultLeadTime) {
    return parseLeadTime(defaultLeadTime)
  }

  // Если количество не указано или 0, возвращаем дефолтный срок
  if (!orderQty || orderQty <= 0) {
    if (astanaQty > 0) {
      return { text: '6-10 дней', type: 'fast' }
    }
    if (astanaQty + almatyQty > 0) {
      return { text: '10-14 дней', type: 'medium' }
    }
    // Используем дефолтный срок если есть
    if (defaultLeadTime) {
      return parseLeadTime(defaultLeadTime)
    }
    return { text: 'по запросу', type: 'slow' }
  }

  // Проверяем наличие в Астане
  if (astanaQty >= orderQty) {
    return { text: '6-10 дней', type: 'fast' }
  }

  // Проверяем суммарное наличие
  if (astanaQty + almatyQty >= orderQty) {
    return { text: '10-14 дней', type: 'medium' }
  }

  // Не хватает на складах - если есть дефолтный срок, используем его
  if (defaultLeadTime && defaultLeadTime !== 'по запросу') {
    return parseLeadTime(defaultLeadTime)
  }
  return { text: 'по запросу', type: 'slow' }
}

/**
 * Парсит строку срока в LeadTimeResult
 */
function parseLeadTime(leadTime: string): LeadTimeResult {
  if (leadTime.includes('6-10')) {
    return { text: leadTime, type: 'fast' }
  }
  if (leadTime.includes('10-14')) {
    return { text: leadTime, type: 'medium' }
  }
  return { text: leadTime, type: 'slow' }
}

/**
 * Получить CSS класс для срока доставки
 */
export function getLeadTimeClass(type: LeadTimeType): string {
  switch (type) {
    case 'fast':
      return 'cell-lead-time fast'
    case 'medium':
      return 'cell-lead-time medium'
    case 'slow':
      return 'cell-lead-time slow'
    default:
      return 'cell-lead-time'
  }
}

/**
 * Форматирование цены с разделителями тысяч
 */
export function formatPrice(price: number): string {
  return price.toLocaleString('ru-RU')
}

/**
 * Форматирование итоговой суммы
 */
export function formatTotal(price: number, quantity: number): string {
  const total = price * quantity
  return formatPrice(total)
}
