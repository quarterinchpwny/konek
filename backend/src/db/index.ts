
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import * as schema from './schema';
import * as path from 'path';

const sqlite = new Database('sqlite.db'); // This creates or opens sqlite.db in the project root
export const db = drizzle(sqlite, { schema });

// Run migrations
migrate(db, { migrationsFolder: path.join(__dirname, '../../drizzle') });

console.log('Migrations complete.');
