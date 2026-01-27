import * as schema from './schema.js';
export declare const db: import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema>;
export declare function testConnection(): Promise<boolean>;
export declare function closePool(): Promise<void>;
