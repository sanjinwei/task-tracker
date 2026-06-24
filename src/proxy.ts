import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TOKEN_COOKIE } from '@/lib/auth';

// Routes that don't require authentication
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p));
}

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.startsWith('/favicon.ico') ||
    !!pathname.match(/\.(svg|png|jpg|jpeg|gif|ico|css|js|woff2?)$/)
  );
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths and static assets
  if (isPublicPath(pathname) || isStaticAsset(pathname)) {
    // If already logged in and visiting /login, redirect to /tasks
    if (pathname === '/login') {
      const token = req.cookies.get(TOKEN_COOKIE)?.value;
      if (token) {
        const payload = await verifyToken(token);
        if (payload) {
          return NextResponse.redirect(new URL('/tasks', req.url));
        }
      }
    }
    return NextResponse.next();
  }

  // Check JWT cookie
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    const response = NextResponse.redirect(new URL('/login', req.url));
    // Clear expired/invalid cookie
    response.cookies.delete(TOKEN_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/((?!_next/static|_next/image).*)',
};
