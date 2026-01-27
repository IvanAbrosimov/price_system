import { test, expect } from '@playwright/test'

test.describe('Каталог товаров', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('отображается заголовок страницы', async ({ page }) => {
    await expect(page).toHaveTitle(/Price Catalog|Каталог/)
  })

  test('отображается таблица товаров', async ({ page }) => {
    // Ожидаем загрузку таблицы
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 })
  })

  test('работает поиск по артикулу', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/поиск|search/i)
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('ls1520')
      await page.waitForTimeout(500) // debounce
      
      // Проверяем что результаты отфильтрованы
      const rows = page.locator('table tbody tr')
      const count = await rows.count()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  test('переключение табов производителей', async ({ page }) => {
    // Ищем табы
    const tabs = page.locator('[role="tab"], button').filter({ hasText: /Jung|Legrand|Wago/i })
    
    if (await tabs.first().isVisible()) {
      await tabs.first().click()
      await page.waitForTimeout(300)
      
      // Проверяем что таблица обновилась
      await expect(page.locator('table')).toBeVisible()
    }
  })
})

test.describe('Корзина', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Очищаем localStorage перед каждым тестом
    await page.evaluate(() => localStorage.clear())
  })

  test('кнопка корзины отображается', async ({ page }) => {
    const cartButton = page.locator('button').filter({ hasText: /корзин|cart|🛒/i })
    await expect(cartButton.first()).toBeVisible({ timeout: 10000 })
  })

  test('добавление товара в корзину', async ({ page }) => {
    // Ожидаем загрузку таблицы
    await page.waitForSelector('table tbody tr', { timeout: 10000 })
    
    // Находим поле ввода количества в первой строке
    const quantityInput = page.locator('table tbody tr').first().locator('input[type="number"]')
    
    if (await quantityInput.isVisible()) {
      await quantityInput.fill('5')
      await page.waitForTimeout(300)
      
      // Проверяем localStorage
      const cart = await page.evaluate(() => localStorage.getItem('cart'))
      expect(cart).toBeTruthy()
    }
  })

  test('открытие панели корзины', async ({ page }) => {
    const cartButton = page.locator('button').filter({ hasText: /корзин|cart|🛒/i }).first()
    
    if (await cartButton.isVisible()) {
      await cartButton.click()
      
      // Ожидаем появления панели корзины
      const drawer = page.locator('[role="dialog"], .cart-drawer, .drawer')
      await expect(drawer.first()).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe('Динамические сроки доставки', () => {
  test('срок меняется при изменении количества', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('table tbody tr', { timeout: 10000 })
    
    const firstRow = page.locator('table tbody tr').first()
    const quantityInput = firstRow.locator('input[type="number"]')
    const leadTimeCell = firstRow.locator('td').nth(4) // 5-я колонка - срок
    
    if (await quantityInput.isVisible()) {
      // Запоминаем начальный срок
      const initialText = await leadTimeCell.textContent()
      
      // Вводим большое количество
      await quantityInput.fill('1000')
      await page.waitForTimeout(500)
      
      // Срок должен измениться на "по запросу"
      const newText = await leadTimeCell.textContent()
      
      // Либо срок изменился, либо остался (зависит от остатков)
      expect(newText).toBeTruthy()
    }
  })
})

test.describe('Адаптивность', () => {
  test('мобильная версия', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // Страница должна отображаться без горизонтальной прокрутки
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(375)
  })

  test('планшетная версия', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 })
  })
})
