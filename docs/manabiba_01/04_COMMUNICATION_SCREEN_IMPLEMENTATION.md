# コミュニケーション画面 実装仕様（現状）

## 目的

`/communication` における **館長から（一方通行）** と **メッセージボード（コーチ↔クライアント）** の UI・挙動・定数・サブスク連携の差し込み点を、コードと同期した形で記録する。

---

## ルーティング・URL

| パス | 内容 |
|------|------|
| `/communication` | クエリ省略時は **館長から** と同等の初期表示（実装では `tab` 未指定時に館長タブを表示）。 |
| `/communication?tab=director` | **館長から**（新着順のカード一覧。現状はダミーデータ）。 |
| `/communication?tab=board` | **メッセージボード**。 |
| `/communication?tab=…&coachClient={uid}` | **コーチ表示**時の対象クライアント。`/trial_4w` の `coachClient` と **同一クエリ名で共有**。 |

ホーム「道場からの新着」の詳細リンクは **`/communication?tab=director`**（`HomeWhatsNewDojo.tsx`）。

---

## メニューバー

- **`trial-menu-bar` 準拠**の2タブのみ（トライアル側の共有ボタン等は同バー右端にコミュニケーション専用の **クライアント選択** のみ配置）。
- タブ順: **館長から** → **メッセージボード**（仕様上「新着」は館長タブの並び順で表現）。

---

## メッセージボード（仕様と実装の対応）

| 仕様 | 実装状況 |
|------|----------|
| 相手左・自身右（LINE 風） | 実装済み（デモメッセージはクライアント／コーチで左右を切替）。 |
| メタ行: `作成：yyyy/mm/dd`・「編集済み」・編集アイコン（編集日時は非表示） | 実装済み（JST は `Intl` + `Asia/Tokyo`）。 |
| 編集はモーダル、保存／キャンセルのみ、オーバーレイクリックで閉じない、Esc では編集を閉じない | 実装済み（Esc は編集オープン中はサイドバー閉じにも使わないようキャプチャ処理）。 |
| 入力: 朝・晩同様フォーカス。Esc で入力欄 blur | 実装済み。 |
| クリアは確認ダイアログ | `window.confirm`。 |
| 送信中は送る無効 | 実装済み。 |
| 送信後は入力クリア＋フォーカス維持 | 実装済み。 |
| クライアント送信上限（定数） | `COMMUNICATION_CLIENT_MESSAGE_SEND_LIMIT`（`src/lib/communicationConstants.ts`）。`mode === 'client'` かつ自分の吹き出しの件数で判定。 |
| 既読（メッセージ単位） | 自分の吹き出しに `readAt` がある場合「既読 …」表示（デモは1件のみ）。 |
| プレミアムのみ利用可 | `COMMUNICATION_PREMIUM_BOARD_UNLOCKED` が **`false` の間**は案内＋入力不可（Firestore 未接続）。**サブスク処理実装後**は `users/{uid}.subscription` 等の判定に置き換える。 |
| コーチ: 未選択時は案内＋入力不可、初回はクライアントピッカー | `CoachClientPickerModal` を利用。初回のみ自動オープン（解除後は再選択可）。 |
| 管理者: 右上対象者非表示 | 実装済み。 |
| 右上: `displayName` / `photoURL` | クライアント: 割当コーチのプロフィール。コーチ: 選択クライアントのプロフィール。 |
| コーチ共有データ境界（1行） | `COACH_SHARED_JOURNAL_VISIBILITY_RULE` を画面下部に注記。 |

---

## プレミアム・サブスク連携（次の作業）

1. **`COMMUNICATION_PREMIUM_BOARD_UNLOCKED` を廃止または内部のみの開発用フラグに降格**し、本番は **`UserProfile.subscription`（例: `plan === 'premium'`）** および必要なら `status` / `endDate` で判定する。  
2. **メッセージの永続化**: Firestore コレクション設計・セキュリティルール（コーチは割当クライアントのスレッドのみ等）。  
3. **送信上限**: 現状は「スレッド内・クライアント発の件数」のシミュレーション。要件に応じて **日次／月次リセット**やプラン別上限を [01_ROLES_AND_SUBSCRIPTION_DESIGN.md](./01_ROLES_AND_SUBSCRIPTION_DESIGN.md)（§6.1 の索引参照）と整合させる。  
4. **既読**: サーバー更新（フィールドまたはサブコレクション）とルール。

サブスク仕様の**正本・索引**は [01_ROLES_AND_SUBSCRIPTION_DESIGN.md](./01_ROLES_AND_SUBSCRIPTION_DESIGN.md) の **§6.1（サブスクリプション仕様が記載されているドキュメント索引）** に集約した。

---

## 関連ソース（ファイル）

| 種別 | パス |
|------|------|
| ページエントリ | `src/app/communication/page.tsx`（`Suspense`） |
| 画面ロジック | `src/components/communication/CommunicationPageClient.tsx` |
| 定数・暫定フラグ | `src/lib/communicationConstants.ts` |
| スタイル | `src/styles/home-trial.css`（`.communication-*`） |
| クライアントピッカー | `src/components/trial/CoachClientPickerModal.tsx` |
| 割当参照 | `src/lib/coachAffirmationShare.ts`（`getActiveCoachAssignmentForClient` 等） |

---

## ホーム画面との関連（レイアウト・マネジメント）

本ドキュメント対象外だが、同一リリース周期での変更として以下を参照する。

- **セクション区切り・幅狭時のカラム順**: `docs/manabiba_01/04_HOME_SCREEN_IMPLEMENTATION.md` の「レイアウト更新（2026-05）」。
- **今週の実施状況のコンパクトグリッド**: `HomeDashboard.tsx` + `home-trial.css`（週次グリッド・`weekly-result-date-row`）。

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-05-12 | 初版: コミュニケーション UI・定数・プレミアム暫定フラグ・サブスク差し込みメモ。 |
