import { NextRequest, NextResponse } from 'next/server';
import {
  isYouTubeUrl,
  getYouTubeVideoId,
  getYouTubeThumbnailUrl,
} from '@/lib/youtube';

const YOUTUBE_OEMBED_BASE = 'https://www.youtube.com/oembed';

/** YouTube oEmbed で取得できる項目（スキーマは YouTube 固定。制作者は値のみ変更可能） */
export interface YouTubeOEmbedResponse {
  title?: string;
  thumbnail_url?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
}

/** oEmbed を叩いて JSON を返す。失敗時は null */
async function fetchOEmbed(url: string): Promise<YouTubeOEmbedResponse | null> {
  const oembedUrl = `${YOUTUBE_OEMBED_BASE}?url=${encodeURIComponent(url)}&format=json`;
  const res = await fetch(oembedUrl, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 0 },
  });
  if (!res.ok) return null;
  return (await res.json()) as YouTubeOEmbedResponse;
}

/**
 * GET /api/youtube-oembed?url=...
 * YouTube の oEmbed からタイトル・サムネイルURL等を取得する（API キー不要）。
 * Shorts など oEmbed が効かない URL の場合は、動画 ID からサムネイルのみ返すフォールバックあり。
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
  if (!isYouTubeUrl(trimmed)) {
    return NextResponse.json(
      { error: 'YouTube の URL を指定してください。（youtube.com / youtu.be / shorts 対応）' },
      { status: 400 }
    );
  }

  const videoId = getYouTubeVideoId(trimmed);

  try {
    // 1) まずそのまま oEmbed を試す
    let data = await fetchOEmbed(trimmed);

    // 2) Shorts 等で失敗した場合、正規の watch URL で再試行
    if (!data && videoId) {
      const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
      if (canonicalUrl !== trimmed) {
        data = await fetchOEmbed(canonicalUrl);
      }
    }

    if (data) {
      return NextResponse.json({
        title: data.title ?? '',
        thumbnail_url: data.thumbnail_url ?? '',
        author_name: data.author_name ?? '',
        author_url: data.author_url ?? '',
        thumbnail_width: data.thumbnail_width ?? undefined,
        thumbnail_height: data.thumbnail_height ?? undefined,
      });
    }

    // 3) oEmbed が使えない場合（Shorts 等）: 動画 ID からサムネイルのみ返す（タイトル・作者は手入力）
    if (videoId) {
      const thumbnailUrl = getYouTubeThumbnailUrl(videoId, 'hqdefault');
      return NextResponse.json({
        title: '',
        thumbnail_url: thumbnailUrl,
        author_name: '',
        author_url: '',
        thumbnail_width: undefined,
        thumbnail_height: undefined,
      });
    }

    return NextResponse.json(
      { error: '動画 ID を取得できませんでした。URL を確認してください。' },
      { status: 400 }
    );
  } catch (e) {
    console.error('youtube-oembed error:', e);
    return NextResponse.json(
      { error: '動画情報の取得に失敗しました。しばらくしてから再試行してください。' },
      { status: 502 }
    );
  }
}
