import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './db';

async function main() {
  try {
    console.log('Running migrations...');
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Migrations complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {

  }
}

main();