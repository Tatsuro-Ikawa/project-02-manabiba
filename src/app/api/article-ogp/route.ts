import { NextRequest, NextResponse } from 'next/server';

/**
 * 記事URLの HTML から Open Graph メタタグを抽出する
 * note・Yahoo!ニュースなど多くのサイトが og:title, og:description, og:image, og:site_name を提供
 */
function extractOgContent(html: string): {
  title: string;
  description: string;
  image: string;
  site_name: string;
} {
  const result = { title: '', description: '', image: '', site_name: '' };

  const patterns = [
    { key: 'title' as const, props: ['og:title', 'twitter:title'] },
    { key: 'description' as const, props: ['og:description', 'twitter:description'] },
    { key: 'image' as const, props: ['og:image', 'twitter:image'] },
    { key: 'site_name' as const, props: ['og:site_name'] },
  ] as const;

  for (const { key, props } of patterns) {
    for (const prop of props) {
      // property="og:title" content="..." または content="..." property="og:title"
      const re1 = new RegExp(
        `property=["']${prop.replace(/:/g, '\\:')}["']\\s+content=["']([^"']*)["']`,
        'i'
      );
      const re2 = new RegExp(
        `content=["']([^"']*)["']\\s+property=["']${prop.replace(/:/g, '\\:')}["']`,
        'i'
      );
      const m = html.match(re1) || html.match(re2);
      if (m && m[1]) {
        result[key] = m[1].trim().replace(/&amp;/g, '&').replace(/&#39;/g, "'");
        break;
      }
    }
  }

  return result;
}

/**
 * GET /api/article-ogp?url=...
 * 指定URLの HTML を取得し、Open Graph タグから title / description / image / site_name を返す
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url || typeof url !== 'string' || !url.trim()) {
    return NextResponse.json(
      { error: 'url パラメータを指定してください。' },
      { status: 400 }
    );
  }

  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return NextResponse.json(
      { error: '有効な http / https の URL を指定してください。' },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(trimmed, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `ページの取得に失敗しました（${res.status}）。` },
        { status: 502 }
      );
    }

    const html = await res.text();
    const maxLen = 300000;
    const slice = html.length > maxLen ? html.slice(0, maxLen) : html;
    const og = extractOgContent(slice);

    let thumbnailUrl = og.image;
    if (thumbnailUrl && !/^https?:\/\//i.test(thumbnailUrl)) {
      try {
        const base = new URL(trimmed);
        thumbnailUrl = new URL(thumbnailUrl, base.origin).href;
      } catch {
        thumbnailUrl = og.image;
      }
    }

    return NextResponse.json({
      title: og.title,
      lead: og.description,
      thumbnail_url: thumbnailUrl || '',
      source: og.site_name,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'タイムアウトしました。URL を確認するか、しばらくして再試行してください。' },
        { status: 504 }
      );
    }
    console.error('article-ogp error:', e);
    return NextResponse.json(
      { error: '記事情報の取得に失敗しました。URL が正しいか確認してください。' },
      { status: 502 }
    );
  }
}
