import { NextResponse } from 'next/server';

export const runtime = 'edge';

const PASSWORD = 'kaynayonthebed';

export async function POST(request) {
  const body = await request.json();

  if (body.password === PASSWORD) {
    const response = NextResponse.json({ success: true });
    response.cookies.set('kaoni_auth', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
    return response;
  }

  return NextResponse.json({ success: false, error: 'Wrong password' }, { status: 401 });
}
