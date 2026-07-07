/**
 * コミュニケーション画面（メッセージボード）用の定数。
 * プレミアム可否は `resolveEntitlements`（`communication.message_board`）で判定する。
 */

/**
 * クライアントが1スレッド内で送信できるメッセージ数の上限（暫定）。
 * Firestore 連携後は期間（日次／月次）やプランに応じて変更する。
 */
export const COMMUNICATION_CLIENT_MESSAGE_SEND_LIMIT = 50;

/** ホーム「コーチからの新着」プレビュー最大文字数（超過分はメッセージボード詳細へ） */
export const HOME_COACH_NEWS_PREVIEW_MAX_CHARS = 100;

/** ホーム「道場からの新着」プレビュー最大文字数（館長から本文の平文抜粋） */
export const HOME_DOJO_NEWS_PREVIEW_MAX_CHARS = 100;

/** 館長からお知らせ：タイトル最大文字数 */
export const DIRECTOR_ANNOUNCEMENT_TITLE_MAX_LENGTH = 120;

/** 館長からお知らせ：本文 Markdown 最大文字数（行動宣言とは別） */
export const DIRECTOR_ANNOUNCEMENT_BODY_MAX_LENGTH = 1500;

/** 館長から一覧の1ページあたり件数 */
export const DIRECTOR_ANNOUNCEMENT_PAGE_SIZE = 10;

/**
 * コーチ閲覧（朝・晩／週・月のカレンダー由来）の共有境界（仕様1行）:
 * カレンダーに必要な区分・日付キー・集計に必要な最小項目のみコーチへ渡し、
 * 本文・自由メモ・アファメーション全文など識別・推測に耐えない長文は共有対象外とする。
 */
export const COACH_SHARED_JOURNAL_VISIBILITY_RULE =
  'カレンダーに必要な区分・日付キー・集計に必要な最小項目のみコーチへ渡し、本文・自由メモ・アファメーション全文などの長文は共有対象外とする。';
