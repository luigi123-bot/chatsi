import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import path from 'path';

// Use absolute path for the database to ensure all processes use the same file
const dbPath = path.resolve(process.cwd(), 'sqlite.db');
const sqlite = new Database(dbPath);

export const db = drizzle(sqlite, { schema });

console.log(`✅ SQLite Database connected at: ${dbPath}`);
