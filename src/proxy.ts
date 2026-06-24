import { NextRequest, NextResponse } from 'next/server';

// Simple Basic Auth guard. Set APP_PASSWORD in Vercel environment variables.
// If APP_PASSWORD is not set, all requests pass through (opt-in security).
export default function proxy(req: NextRequest) {
  const appPassword = process.env.APP_PASSWORD;

  // No password configured → allow all (for local dev or opt-in)
  if (!appPassword) {
    return NextResponse.next();
  }

  const auth = req.headers.get('authorization');
  // Use Web API btoa() instead of Node Buffer for Edge runtime compatibility
  const expected = 'Basic ' + btoa('admin:' + appPassword);

  if (auth !== expected) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Task Tracker", charset="UTF-8"',
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  // Apply to all routes except API (AI chat proxy needs to be usable without browser auth)
  // and static assets.
  matcher: '/((?!api/ai/chat|_next/static|_next/image|favicon.ico).*)',
};
