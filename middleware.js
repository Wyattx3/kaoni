import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow login page and API login route
  if (pathname === '/login' || pathname === '/api/auth') {
    return NextResponse.next();
  }

  // Check auth cookie
  const authCookie = request.cookies.get('kaoni_auth');
  if (!authCookie || authCookie.value !== 'authenticated') {
    // Redirect to login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.jpg).*)'],
};
