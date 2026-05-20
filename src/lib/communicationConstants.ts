/**
 * コミュニケーション画面（メッセージボード）用の定数。
 * プレミアム可否は `resolveEntitlements`（`communication.message_board`）で判定する。
 */

/**
 * クライアントが1スレッド内で送信できるメッセージ数の上限（暫定）。
 * Firestore 連携後は期間（日次／月次）やプランに応じて変更する。
 */
export const COMMUNICATION_CLIENT_MESSAGE_SEND_LIMIT = 50;

/**
 * コーチ閲覧（朝・晩／週・月のカレンダー由来）の共有境界（仕様1行）:
 * カレンダーに必要な区分・日付キー・集計に必要な最小項目のみコーチへ渡し、
 * 本文・自由メモ・アファメーション全文など識別・推測に耐えない長文は共有対象外とする。
 */
export const COACH_SHARED_JOURNAL_VISIBILITY_RULE =
  'カレンダーに必要な区分・日付キー・集計に必要な最小項目のみコーチへ渡し、本文・自由メモ・アファメーション全文などの長文は共有対象外とする。';
