/**
 * Утилита для экспорта корзины в Excel
 */

import * as XLSX from 'xlsx'
import { CartItem } from '../types'

interface ExportRow {
  'Производитель': string
  'Артикул': string
  'Наименование': string
  'Цена, ₽': number
  'Количество': number
  'Сумма, ₽': number
  'Срок поставки': string
}

/**
 * Экспортирует корзину в Excel файл
 * @param items - массив товаров из корзины
 * @param filename - имя файла (без расширения)
 */
export function exportCartToExcel(items: CartItem[], filename: string = 'Заказ'): void {
  if (items.length === 0) {
    alert('Корзина пуста. Нечего выгружать.')
    return
  }

  // Группируем товары по производителю для удобства
  const groupedItems = groupByManufacturer(items)

  // Формируем строки для Excel
  const rows: ExportRow[] = []
  
  Object.entries(groupedItems).forEach(([manufacturer, manufacturerItems]) => {
    manufacturerItems.forEach(item => {
      rows.push({
        'Производитель': manufacturer,
        'Артикул': item.article,
        'Наименование': item.name,
        'Цена, ₽': item.priceRub,
        'Количество': item.quantity,
        'Сумма, ₽': item.priceRub * item.quantity,
        'Срок поставки': item.leadTime
      })
    })
  })

  // Добавляем итоговую строку
  const totalSum = items.reduce((sum, item) => sum + item.priceRub * item.quantity, 0)
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0)
  
  rows.push({
    'Производитель': '',
    'Артикул': '',
    'Наименование': 'ИТОГО:',
    'Цена, ₽': 0,
    'Количество': totalQty,
    'Сумма, ₽': totalSum,
    'Срок поставки': ''
  })

  // Создаем рабочую книгу
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(rows)

  // Устанавливаем ширину колонок
  worksheet['!cols'] = [
    { wch: 20 }, // Производитель
    { wch: 15 }, // Артикул
    { wch: 50 }, // Наименование
    { wch: 12 }, // Цена
    { wch: 12 }, // Количество
    { wch: 15 }, // Сумма
    { wch: 15 }, // Срок поставки
  ]

  // Добавляем лист в книгу
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Заказ')

  // Генерируем имя файла с датой
  const date = new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')
  const fullFilename = `${filename}_${date}.xlsx`

  // Скачиваем файл
  XLSX.writeFile(workbook, fullFilename)
}

/**
 * Группирует товары по производителю
 */
function groupByManufacturer(items: CartItem[]): Record<string, CartItem[]> {
  return items.reduce((groups, item) => {
    const key = item.manufacturer
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(item)
    return groups
  }, {} as Record<string, CartItem[]>)
}

/**
 * Форматирует дату для имени файла
 */
export function getFormattedDate(): string {
  const now = new Date()
  return now.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\./g, '-')
}
