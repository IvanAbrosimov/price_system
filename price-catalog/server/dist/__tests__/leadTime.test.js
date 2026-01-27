import { describe, it, expect } from 'vitest';
/**
 * Функция расчёта динамического срока доставки
 * @param astanaQty - остаток на складе Астана
 * @param almatyQty - остаток на складе Алматы
 * @param orderQty - заказываемое количество
 * @returns строка со сроком доставки
 */
export function getDynamicLeadTime(astanaQty, almatyQty, orderQty) {
    if (orderQty <= 0)
        return '';
    if (astanaQty >= orderQty)
        return '6-10 дней';
    if ((astanaQty + almatyQty) >= orderQty)
        return '10-14 дней';
    return 'по запросу';
}
describe('getDynamicLeadTime', () => {
    it('достаточно в Астане → 6-10 дней', () => {
        expect(getDynamicLeadTime(14, 2, 14)).toBe('6-10 дней');
    });
    it('точно хватает в Астане → 6-10 дней', () => {
        expect(getDynamicLeadTime(10, 5, 10)).toBe('6-10 дней');
    });
    it('меньше чем в Астане → 6-10 дней', () => {
        expect(getDynamicLeadTime(20, 10, 5)).toBe('6-10 дней');
    });
    it('не хватает в Астане, но суммарно хватает → 10-14 дней', () => {
        expect(getDynamicLeadTime(14, 2, 15)).toBe('10-14 дней');
    });
    it('точно хватает суммарно → 10-14 дней', () => {
        expect(getDynamicLeadTime(14, 2, 16)).toBe('10-14 дней');
    });
    it('суммарно не хватает → по запросу', () => {
        expect(getDynamicLeadTime(14, 2, 17)).toBe('по запросу');
    });
    it('нули на складах → по запросу', () => {
        expect(getDynamicLeadTime(0, 0, 1)).toBe('по запросу');
    });
    it('заказ 0 → пустая строка', () => {
        expect(getDynamicLeadTime(10, 10, 0)).toBe('');
    });
    it('отрицательный заказ → пустая строка', () => {
        expect(getDynamicLeadTime(10, 10, -5)).toBe('');
    });
    it('большой заказ при маленьком остатке → по запросу', () => {
        expect(getDynamicLeadTime(5, 3, 100)).toBe('по запросу');
    });
});
