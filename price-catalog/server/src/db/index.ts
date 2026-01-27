import { drizzle } from 'drizzle-orm/node-postgres'
import pkg from 'pg'
import * as schema from './schema.js'

const { Pool } = pkg

// Создаем пул подключений
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

// Экспортируем клиент Drizzle
export const db = drizzle(pool, { schema })

// Функция для проверки подключения
export async function testConnection() {
  try {
    const client = await pool.connect()
    console.log('✅ Успешное подключение к PostgreSQL')
    client.release()
    return true
  } catch (error) {
    console.error('❌ Ошибка подключения к PostgreSQL:', error)
    return false
  }
}

// Закрытие пула при завершении
export async function closePool() {
  await pool.end()
}
