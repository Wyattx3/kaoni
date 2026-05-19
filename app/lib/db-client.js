import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_A2xJkiSKXY9g@ep-sweet-art-aoeszlpj-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

export function formatProduct(row) {
  let images = [];
  let extraCharge = 0;
  let extraChargeNote = '';
  let discount = 0;
  let discountNote = '';

  let raw = row.images;
  if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch(e) { raw = []; } }
  if (Array.isArray(raw)) { images = raw; }
  else if (raw && typeof raw === 'object') {
    images = raw.imgs || [];
    extraCharge = raw.extraCharge || 0;
    extraChargeNote = raw.extraChargeNote || '';
    discount = raw.discount || 0;
    discountNote = raw.discountNote || '';
  }
  return { id: row.id, name: row.name, images, costPrice: parseFloat(row.cost_price), sellingPrice: parseFloat(row.selling_price), quantity: row.quantity, extraCharge, extraChargeNote, discount, discountNote };
}

export function formatSale(row) {
  let data = row.items;
  if (typeof data === 'string') { try { data = JSON.parse(data); } catch(e) { data = {}; } }
  const items = Array.isArray(data) ? data : (data.items || []);
  const buyerName = Array.isArray(data) ? '' : (data.buyerName || '');
  const totalExtra = Array.isArray(data) ? 0 : (data.totalExtra || 0);
  const totalDiscount = Array.isArray(data) ? 0 : (data.totalDiscount || 0);
  return { id: row.id, items, buyerName, totalAmount: parseFloat(row.total_amount), totalProfit: parseFloat(row.total_profit), totalExtra, totalDiscount, totalItems: row.total_items, status: row.status, createdAt: row.created_at };
}

export async function getProducts() {
  const rows = await sql`SELECT * FROM products ORDER BY created_at DESC`;
  return rows.map(formatProduct);
}

export async function addProduct(p) {
  const imgData = JSON.stringify({ imgs: p.images || [], extraCharge: p.extraCharge || 0, extraChargeNote: p.extraChargeNote || '', discount: p.discount || 0, discountNote: p.discountNote || '' });
  const rows = await sql`INSERT INTO products (name, images, cost_price, selling_price, quantity) VALUES (${p.name}, ${imgData}, ${p.costPrice}, ${p.sellingPrice}, ${p.quantity}) RETURNING *`;
  return formatProduct(rows[0]);
}

export async function updateProduct(id, data) {
  if (data.quantity !== undefined && !data.name) {
    await sql`UPDATE products SET quantity = ${data.quantity}, updated_at = NOW() WHERE id = ${id}`;
  } else {
    const imgData = JSON.stringify({ imgs: data.images || [], extraCharge: data.extraCharge || 0, extraChargeNote: data.extraChargeNote || '', discount: data.discount || 0, discountNote: data.discountNote || '' });
    await sql`UPDATE products SET name = ${data.name}, images = ${imgData}, cost_price = ${data.costPrice}, selling_price = ${data.sellingPrice}, quantity = ${data.quantity}, updated_at = NOW() WHERE id = ${id}`;
  }
}

export async function deleteProduct(id) {
  await sql`DELETE FROM products WHERE id = ${id}`;
}

export async function getSales() {
  const rows = await sql`SELECT * FROM sales ORDER BY created_at DESC`;
  return rows.map(formatSale);
}

export async function createSale(sale) {
  const itemsData = JSON.stringify({ items: sale.items, buyerName: sale.buyerName || '', totalExtra: sale.totalExtra || 0, totalDiscount: sale.totalDiscount || 0 });
  await sql`INSERT INTO sales (items, total_amount, total_profit, total_items, status) VALUES (${itemsData}, ${sale.totalAmount}, ${sale.totalProfit}, ${sale.totalItems}, 'completed')`;
  for (const item of sale.items) {
    await sql`UPDATE products SET quantity = quantity - ${item.sellQty}, updated_at = NOW() WHERE id = ${item.id}`;
  }
}
