/**
 * Функция расчёта динамического срока доставки
 * @param astanaQty - остаток на складе Астана
 * @param almatyQty - остаток на складе Алматы
 * @param orderQty - заказываемое количество
 * @returns строка со сроком доставки
 */
export declare function getDynamicLeadTime(astanaQty: number, almatyQty: number, orderQty: number): string;
