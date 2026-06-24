import { NextRequest, NextResponse } from 'next/server';
import { signToken, getTokenCookie } from '@/lib/auth';

const AUTH_USERNAME = process.env.APP_USERNAME || 'admin';
const AUTH_PASSWORD = process.env.APP_PASSWORD || 'admin123';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: '请输入账号和密码' },
        { status: 400 }
      );
    }

    if (username !== AUTH_USERNAME || password !== AUTH_PASSWORD) {
      return NextResponse.json(
        { success: false, message: '账号或密码错误' },
        { status: 401 }
      );
    }

    const token = await signToken(username);
    const response = NextResponse.json({ success: true, message: '登录成功' });
    response.headers.set('Set-Cookie', getTokenCookie(token));

    return response;
  } catch {
    return NextResponse.json(
      { success: false, message: '登录失败，请重试' },
      { status: 500 }
    );
  }
}
