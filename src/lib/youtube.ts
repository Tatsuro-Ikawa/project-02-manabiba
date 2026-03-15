/**
 * YouTube URL 用の共通ユーティリティ
 * - 動画 ID 抽出（watch?v=, youtu.be, embed/ に対応）
 * - 埋め込み URL・サムネイル URL の組み立て
 */

const YOUTUBE_URL_PATTERNS = [
  /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
  /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,  // YouTube Shorts
  /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
];

/** 有効な YouTube 動画 ID の長さ（11文字） */
const VIDEO_ID_LENGTH = 11;

/**
 * URL から YouTube の動画 ID を抽出する
 * @param url youtube.com/watch?v=XXX, youtu.be/XXX, youtube.com/embed/XXX, youtube.com/shorts/XXX のいずれか
 * @returns 動画 ID。取得できない場合は null
 */
export function getYouTubeVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match && match[1] && match[1].length === VIDEO_ID_LENGTH) {
      return match[1];
    }
  }
  return null;
}

/**
 * YouTube の URL かどうかを判定する
 */
export function isYouTubeUrl(url: string): boolean {
  return getYouTubeVideoId(url) !== null;
}

/**
 * 再生用の埋め込み URL を返す
 * @param url または videoId
 */
export function getYouTubeEmbedUrl(urlOrVideoId: string): string {
  const videoId = urlOrVideoId.length === VIDEO_ID_LENGTH && !urlOrVideoId.includes('/')
    ? urlOrVideoId
    : getYouTubeVideoId(urlOrVideoId);
  if (!videoId) return '';
  return `https://www.youtube.com/embed/${videoId}`;
}

export type YouTubeThumbnailQuality = 'default' | 'mqdefault' | 'hqdefault' | 'sddefault' | 'maxresdefault';

/**
 * サムネイル画像の URL を組み立てる（API 不要）
 * @param videoId 動画 ID
 * @param quality 画質。maxresdefault は存在しない動画で 404 になることがある
 */
export function getYouTubeThumbnailUrl(
  videoId: string,
  quality: YouTubeThumbnailQuality = 'hqdefault'
): string {
  if (!videoId || videoId.length !== VIDEO_ID_LENGTH) return '';
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}
