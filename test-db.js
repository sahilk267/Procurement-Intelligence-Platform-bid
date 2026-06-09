import pg from 'pg';

const { Pool } = pg;

async function testConnection() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/procureintel'
  });

  try {
    console.log('Testing database connection...');
    const client = await pool.connect();
    console.log('Connected successfully!');

    const result = await client.query('SELECT version()');
    console.log('PostgreSQL version:', result.rows[0].version);

    const tablesResult = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Existing tables:', tablesResult.rows.map(r => r.table_name));

    client.release();
    console.log('Connection test completed.');
  } catch (error) {
    console.error('Database connection failed:', error.message);
  } finally {
    await pool.end();
  }
}

testConnection();