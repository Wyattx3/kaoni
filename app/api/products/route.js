import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

const sql = neon('postgresql://neondb_owner:npg_A2xJkiSKXY9g@ep-sweet-art-aoeszlpj-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

function formatProduct(row) {
  let images = [];
  let extraCharge = 0;
  let extraChargeNote = '';
  let discount = 0;
  let discountNote = '';

  let raw = row.images;
  if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch(e) { raw = []; } }
  if (Array.isArray(raw)) {
    images = raw;
  } else if (raw && typeof raw === 'object') {
    images = raw.imgs || [];
    extraCharge = raw.extraCharge || 0;
    extraChargeNote = raw.extraChargeNote || '';
    discount = raw.discount || 0;
    discountNote = raw.discountNote || '';
  }

  return {
    id: row.id,
    name: row.name,
    images,
    costPrice: parseFloat(row.cost_price),
    sellingPrice: parseFloat(row.selling_price),
    quantity: row.quantity,
    extraCharge,
    extraChargeNote,
    discount,
    discountNote,
  };
}

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM products ORDER BY created_at DESC`;
    return NextResponse.json(rows.map(formatProduct));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (body.action === 'add') {
      const p = body.product;
      const imgData = JSON.stringify({ imgs: p.images || [], extraCharge: p.extraCharge || 0, extraChargeNote: p.extraChargeNote || '', discount: p.discount || 0, discountNote: p.discountNote || '' });
      const rows = await sql`INSERT INTO products (name, images, cost_price, selling_price, quantity) VALUES (${p.name}, ${imgData}, ${p.costPrice}, ${p.sellingPrice}, ${p.quantity}) RETURNING *`;
      return NextResponse.json({ success: true, product: formatProduct(rows[0]) });
    }

    if (body.action === 'update') {
      const p = body.product;
      if (p.quantity !== undefined && !p.name && !p.images) {
        await sql`UPDATE products SET quantity = ${p.quantity}, updated_at = NOW() WHERE id = ${p.id}`;
      } else {
        const imgData = JSON.stringify({ imgs: p.images || [], extraCharge: p.extraCharge || 0, extraChargeNote: p.extraChargeNote || '', discount: p.discount || 0, discountNote: p.discountNote || '' });
        await sql`UPDATE products SET name = ${p.name}, images = ${imgData}, cost_price = ${p.costPrice}, selling_price = ${p.sellingPrice}, quantity = ${p.quantity}, updated_at = NOW() WHERE id = ${p.id}`;
      }
      return NextResponse.json({ success: true });
    }

    if (body.action === 'delete') {
      await sql`DELETE FROM products WHERE id = ${body.id}`;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
