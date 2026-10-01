/**
 * リリース前機能の Feature Flag（方式 A: 環境変数で Production / Preview を切替）。
 *
 * Vercel の Environment Variables で Preview のみ `true`、Production は `false` に設定する。
 * ローカルで刷新 UI を確認するときは `.env.local` に同キーを `true` で追加。
 *
 * @see docs/DEPLOY_GITHUB_VERCEL.md §3
 */

/** Vercel / .env.local で設定するキー一覧（ドキュメント・設定画面用） */
export const FEATURE_FLAG_ENV_KEYS = {
  /** `/start-program` 全面刷新 UI */
  startProgramRefresh: 'NEXT_PUBLIC_FF_START_PROGRAM_REFRESH',
} as const;

/**
 * 7日間スタートプログラム（/start-program）の刷新 UI を表示するか。
 * 未設定・false = 現行 UI。true = 刷新 UI（StartProgramRefreshView）。
 *
 * NOTE: クライアントバンドルへ埋め込むため、キー名はリテラルで参照する（`process.env[key]` は不可）。
 */
export function isStartProgramRefreshEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FF_START_PROGRAM_REFRESH === 'true';
}
