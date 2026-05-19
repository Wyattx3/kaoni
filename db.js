const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    'postgresql://neondb_owner:npg_A2xJkiSKXY9g@ep-sweet-art-aoeszlpj-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
});

// ==================== PRODUCTS ====================

async function getProducts() {
  const { rows } = await pool.query(
    'SELECT * FROM products ORDER BY created_at DESC'
  );
  return rows.map(formatProduct);
}

async function getProductById(id) {
  const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
  if (rows.length === 0) return null;
  return formatProduct(rows[0]);
}

async function addProduct(product) {
  const { rows } = await pool.query(
    `INSERT INTO products (name, images, cost_price, selling_price, quantity)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      product.name,
      JSON.stringify(product.images || []),
      product.costPrice,
      product.sellingPrice,
      product.quantity,
    ]
  );
  return formatProduct(rows[0]);
}

async function updateProduct(id, updates) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(updates.name);
  }
  if (updates.images !== undefined) {
    fields.push(`images = $${idx++}`);
    values.push(JSON.stringify(updates.images));
  }
  if (updates.costPrice !== undefined) {
    fields.push(`cost_price = $${idx++}`);
    values.push(updates.costPrice);
  }
  if (updates.sellingPrice !== undefined) {
    fields.push(`selling_price = $${idx++}`);
    values.push(updates.sellingPrice);
  }
  if (updates.quantity !== undefined) {
    fields.push(`quantity = $${idx++}`);
    values.push(updates.quantity);
  }

  if (fields.length === 0) return null;

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await pool.query(
    `UPDATE products SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows.length > 0 ? formatProduct(rows[0]) : null;
}

async function deleteProduct(id) {
  const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [id]);
  return rowCount > 0;
}

// ==================== AUTHORIZED USERS ====================

async function getAuthorizedUsers() {
  const { rows } = await pool.query('SELECT chat_id FROM authorized_users');
  return rows.map((r) => r.chat_id);
}

async function addAuthorizedUser(chatId) {
  await pool.query(
    'INSERT INTO authorized_users (chat_id) VALUES ($1) ON CONFLICT DO NOTHING',
    [String(chatId)]
  );
}

async function isAuthorized(chatId) {
  const { rows } = await pool.query(
    'SELECT 1 FROM authorized_users WHERE chat_id = $1',
    [String(chatId)]
  );
  return rows.length > 0;
}

// ==================== HELPERS ====================

function formatProduct(row) {
  return {
    id: row.id,
    name: row.name,
    images: typeof row.images === 'string' ? JSON.parse(row.images) : row.images || [],
    costPrice: parseFloat(row.cost_price),
    sellingPrice: parseFloat(row.selling_price),
    quantity: row.quantity,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ==================== SALES ====================

async function addSale(sale) {
  const { rows } = await pool.query(
    `INSERT INTO sales (items, total_amount, total_profit, total_items, status)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      JSON.stringify(sale.items),
      sale.totalAmount,
      sale.totalProfit,
      sale.totalItems,
      sale.status || 'completed',
    ]
  );
  return formatSale(rows[0]);
}

async function getSales() {
  const { rows } = await pool.query('SELECT * FROM sales ORDER BY created_at DESC');
  return rows.map(formatSale);
}

async function getSaleById(id) {
  const { rows } = await pool.query('SELECT * FROM sales WHERE id = $1', [id]);
  if (rows.length === 0) return null;
  return formatSale(rows[0]);
}

function formatSale(row) {
  return {
    id: row.id,
    items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items || [],
    totalAmount: parseFloat(row.total_amount),
    totalProfit: parseFloat(row.total_profit),
    totalItems: row.total_items,
    status: row.status,
    createdAt: row.created_at,
  };
}

module.exports = {
  pool,
  getProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
  getAuthorizedUsers,
  addAuthorizedUser,
  isAuthorized,
  addSale,
  getSales,
  getSaleById,
};
