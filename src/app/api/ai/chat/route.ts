import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { endpoint, apiKey, model, messages } = await request.json();

    if (!endpoint || !model || !messages) {
      return NextResponse.json(
        { error: 'Missing required fields: endpoint, model, messages' },
        { status: 400 }
      );
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
      console.error(`AI API error (${response.status}):`, errorText);
      return NextResponse.json(
        { error: `AI API 请求失败 (${response.status})` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('AI proxy error:', error);
    return NextResponse.json(
      { error: 'AI 服务请求失败，请检查网络连接和端点配置' },
      { status: 500 }
    );
  }
}
