import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect specific routes
  const needsAuth = pathname.startsWith('/ngo') || pathname.startsWith('/dashboard');
  if (!needsAuth) return NextResponse.next();

  const token = req.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const role = payload?.role;

    // Role-based access control
    if (pathname.startsWith('/ngo') && role !== 'ngo') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (pathname.startsWith('/dashboard') && role !== 'reporter') {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: ['/ngo/:path*', '/dashboard/:path*'],
};
