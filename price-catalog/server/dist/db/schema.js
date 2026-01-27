import { pgTable, serial, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core';
/**
 * Таблица товаров
 */
export const products = pgTable('products', {
    id: serial('id').primaryKey(),
    manufacturer: varchar('manufacturer', { length: 100 }).notNull(),
    article: varchar('article', { length: 100 }).notNull().unique(),
    name: text('name').notNull(),
    priceRub: integer('price_rub').notNull(),
    leadTimeDefault: varchar('lead_time_default', { length: 50 }),
    astanaQty: integer('astana_qty').default(0),
    almatyQty: integer('almaty_qty').default(0),
    catalogUrl: text('catalog_url'),
    imageUrl: text('image_url'),
    updatedAt: timestamp('updated_at').defaultNow()
});
