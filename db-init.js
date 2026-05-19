const { pool } = require('./db');

async function init() {
  console.log('Creating tables...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      images JSONB DEFAULT '[]',
      cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
      selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS authorized_users (
      id SERIAL PRIMARY KEY,
      chat_id VARCHAR(50) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('Tables created successfully.');
  await pool.end();
}

init().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
