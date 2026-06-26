import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// ---- Whitelist: only these endpoints may be called ----
const ALLOWED_AI_ENDPOINTS: Record<string, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
};

// Simple in-memory rate limiter (per IP, 10 req / 60s)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// ---- DB helper: get a setting value by key ----
async function getSetting(key: string): Promise<string | null> {
  const result = await prisma.$queryRaw`
    SELECT value FROM "Setting" WHERE key = ${key}
  ` as { value: string }[];
  return result.length > 0 ? result[0].value : null;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试' },
        { status: 429 }
      );
    }

    const { model, messages } = await request.json();

    if (!model || !messages) {
      return NextResponse.json(
        { error: 'Missing required fields: model, messages' },
        { status: 400 }
      );
    }

    let endpoint: string;
    let apiKey = '';

    // Match by model name prefix (clients may send 'deepseek-chat', 'gpt-4o', etc.)
    if (model.startsWith('lm-studio') || model.startsWith('meta-llama')) {
      // LM Studio runs locally — only allow localhost endpoints
      const saved = await getSetting('lmstudioendpoint');
      endpoint = saved || 'http://localhost:1234/v1/chat/completions';
      if (!/^https?:\/\/localhost(:\d+)?\/.*$/.test(endpoint) &&
          !/^https?:\/\/127\.0\.0\.1(:\d+)?\/.*$/.test(endpoint)) {
        return NextResponse.json(
          { error: 'LM Studio 端点仅允许 localhost' },
          { status: 403 }
        );
      }
    } else if (model.startsWith('deepseek')) {
      endpoint = ALLOWED_AI_ENDPOINTS.deepseek;
      apiKey = (await getSetting('deepseekapikey')) || '';
      if (!apiKey) {
        return NextResponse.json(
          { error: '未配置 DeepSeek API 密钥' },
          { status: 400 }
        );
      }
    } else {
      // Default: OpenAI (gpt-4o, gpt-4, etc.)
      endpoint = ALLOWED_AI_ENDPOINTS.openai;
      apiKey = (await getSetting('openaikey')) || '';
      if (!apiKey) {
        return NextResponse.json(
          { error: '未配置 OpenAI API 密钥' },
          { status: 400 }
        );
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI API error (${response.status})`);
      return NextResponse.json(
        { error: `AI API 请求失败 (${response.status})` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('AI proxy error');
    return NextResponse.json(
      { error: 'AI 服务请求失败，请检查网络连接和端点配置' },
      { status: 500 }
    );
  }
}
