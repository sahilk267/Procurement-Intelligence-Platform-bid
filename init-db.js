import { execSync } from 'child_process';
import { existsSync } from 'fs';

async function initDatabase() {
  try {
    console.log('Setting DATABASE_URL...');
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/procureintel';

    console.log('Running drizzle-kit push...');
    const result = execSync('npx drizzle-kit push --config lib/db/drizzle.config.ts', {
      stdio: 'inherit',
      env: { ...process.env }
    });

    console.log('Schema pushed successfully!');

    console.log('Running seed data...');
    const seedResult = execSync('psql "' + process.env.DATABASE_URL + '" -f database/seeders/seed.sql', {
      stdio: 'inherit'
    });

    console.log('Database initialized successfully!');

  } catch (error) {
    console.error('Error initializing database:', error.message);
    process.exit(1);
  }
}

initDatabase();