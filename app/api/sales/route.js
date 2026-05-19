import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

const sql = neon('postgresql://neondb_owner:npg_A2xJkiSKXY9g@ep-sweet-art-aoeszlpj-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

function formatSale(row) {
  let data = row.items;
  if (typeof data === 'string') { try { data = JSON.parse(data); } catch(e) { data = {}; } }
  const items = Array.isArray(data) ? data : (data.items || []);
  const buyerName = Array.isArray(data) ? '' : (data.buyerName || '');
  const totalExtra = Array.isArray(data) ? 0 : (data.totalExtra || 0);
  const totalDiscount = Array.isArray(data) ? 0 : (data.totalDiscount || 0);
  return {
    id: row.id,
    items,
    buyerName,
    totalAmount: parseFloat(row.total_amount),
    totalProfit: parseFloat(row.total_profit),
    totalExtra,
    totalDiscount,
    totalItems: row.total_items,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM sales ORDER BY created_at DESC`;
    return NextResponse.json(rows.map(formatSale));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (body.action === 'create') {
      const sale = body.sale;
      const itemsData = JSON.stringify({ items: sale.items, buyerName: sale.buyerName || '', totalExtra: sale.totalExtra || 0, totalDiscount: sale.totalDiscount || 0 });
      const rows = await sql`INSERT INTO sales (items, total_amount, total_profit, total_items, status) VALUES (${itemsData}, ${sale.totalAmount}, ${sale.totalProfit}, ${sale.totalItems}, 'completed') RETURNING *`;

      for (const item of sale.items) {
        await sql`UPDATE products SET quantity = quantity - ${item.sellQty}, updated_at = NOW() WHERE id = ${item.id}`;
      }

      return NextResponse.json({ success: true, sale: formatSale(rows[0]) });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
