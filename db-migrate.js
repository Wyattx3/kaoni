const { pool } = require('./db');

async function migrate() {
  console.log('Creating sales tables...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      items JSONB NOT NULL DEFAULT '[]',
      total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      total_profit NUMERIC(12, 2) NOT NULL DEFAULT 0,
      total_items INTEGER NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'completed',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('Sales table created.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
