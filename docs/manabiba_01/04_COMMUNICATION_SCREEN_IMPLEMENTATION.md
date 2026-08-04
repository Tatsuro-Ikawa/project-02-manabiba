# コミュニケーション画面 実装仕様（現状）

## 目的

`/communication` における **館長から（一方通行）** と **メッセージボード（コーチ↔クライアント）** の UI・挙動・定数・サブスク連携の差し込み点を、コードと同期した形で記録する。

### 製品方針の反映（2026-05 確定メモ）

- **コーチ Zoom 面談**: **別アプリ**で実施する。本アプリへの Zoom 組込みは行わない（詳細は [04_SUBSCRIPTION_PRODUCT_SCOPE.md](./04_SUBSCRIPTION_PRODUCT_SCOPE.md) §5）。
- **本アプリに組み込み済みのコミュニケーション関連機能**: **運用を含め再検討**する（仕様・導線・担当）。
- **外部データ入出力**・**個別プログラム（7日間）の実装**: 本バージョンでは行わない（スコープは [04_SUBSCRIPTION_PRODUCT_SCOPE.md](./04_SUBSCRIPTION_PRODUCT_SCOPE.md)）。
- **未提供機能の UI**: **表示しない**（「近日」ラベル等は付けない）。API 応答方針は [04_SUBSCRIPTION_PRODUCT_SCOPE.md](./04_SUBSCRIPTION_PRODUCT_SCOPE.md) §4。

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

### スレッド単位（Q&A 相当）

- **コーチ–クライアントのペアあたり1会話スレッド（1タイムライン）**を既定とする（複数トピックに分岐するフォーラム型は採用しない）。プラン連動・用語の補足は [04_SUBSCRIPTION_PRODUCT_SCOPE.md](./04_SUBSCRIPTION_PRODUCT_SCOPE.md) 付録A・§4。
- **共有 ON/OFF スイッチはない**。`coach_client_assignments` が `active` のペアが、そのまま1本のタイムラインで往復する（気づきノートの `sharedWithCoach` とは別系統）。

### 共有プロセス（データの流れ）

| 役割 | 相手の決め方 | 送信経路 |
|------|-------------|----------|
| **クライアント** | `getActiveCoachAssignmentForClient` で担当コーチ UID を自動解決 | `POST /api/communication/board/message`（`peerUid` = コーチ UID） |
| **コーチ** | `?coachClient={uid}` でクライアント選択 | 同上（`peerUid` = クライアント UID） |

1. API が Bearer・プレミアム（クライアントのみ）・active 割当を検証する。
2. **Admin SDK** で `communication_board_threads/{coachUid}_{clientUid}/messages/{id}` に保存する（クライアント SDK からの直接 write は不可）。
3. 画面は **`tab=board` 表示中のみ** Firestore `onSnapshot` で一覧を購読する。タブを離れる・クライアント未選択になると `unsubscribe` する（常時バックグラウンド監視はしない）。

### Firestore データモデル

| パス | 説明 |
|------|------|
| `communication_board_threads/{threadId}` | スレッド親。`threadId` = `{coachUid}_{clientUid}`（`coach_client_assignments` の ID と同一） |
| `…/messages/{messageId}` | メッセージ1件 |

**スレッド親フィールド（初回送信時に自動作成）**

| フィールド | 型 | 説明 |
|------------|-----|------|
| coachUid | string | コーチ UID |
| clientUid | string | クライアント UID |
| createdAt | Timestamp | 作成 |
| updatedAt | Timestamp | 最終更新 |
| lastMessageAt | Timestamp | 最新メッセージ時刻 |
| lastMessageAuthorUid | string | 最新送信者 |
| lastMessageId | string | 最新メッセージ ID |
| coachLastReadAt | Timestamp（任意） | コーチ既読（最下部到達） |
| clientLastReadAt | Timestamp（任意） | クライアント既読（最下部到達） |

**メッセージフィールド**

| フィールド | 型 | 説明 |
|------------|-----|------|
| authorUid | string | 送信者 UID |
| body | string | 本文 |
| createdAt | Timestamp | 作成 |
| edited | boolean | 編集済みフラグ |
| editedAt | Timestamp（任意） | 最終編集 |
| readAt | Timestamp（任意） | 相手既読（`POST …/board/read` で更新） |

詳細は [03_FIRESTORE_DATABASE_STRUCTURE.md](./03_FIRESTORE_DATABASE_STRUCTURE.md) §2.15。

### 権限・プラン

| 対象 | 閲覧 | 送信・編集 |
|------|------|------------|
| **クライアント**（`plan === 'premium'` かつ有効契約） | ○ | ○ |
| **クライアント**（プレミアム→下位後・`dataRetentionEndsAt` 内） | ○（閲覧のみ） | × |
| **コーチ**（`role` が coach / senior_coach、active 割当あり） | ○ | ○（**プレミアム不要**） |
| **管理者** | × | × |

- クライアントのプレミアム判定: `resolveEntitlements` → **`communication.message_board`**
- コーチの担当コーチ名表示: クライアントが `users/{coachUid}` を read するため、ルールに **`hasActiveCoachAssignmentAsClient`** を追加（2026-07）

### UI 仕様と実装の対応

| 仕様 | 実装状況 |
|------|----------|
| 相手左・自身右（LINE 風） | 実装済み（`authorUid` とログイン UID で左右判定） |
| メタ行: `作成：yyyy/mm/dd`・「編集済み」・編集アイコン（編集日時は非表示） | 実装済み（JST は `Intl` + `Asia/Tokyo`） |
| 編集はモーダル、保存／キャンセルのみ、オーバーレイクリックで閉じない、Esc では編集を閉じない | 実装済み（`PATCH /api/communication/board/message/{id}`） |
| 入力: 朝・晩同様フォーカス。Esc で入力欄 blur | 実装済み |
| クリアは確認ダイアログ | `window.confirm` |
| 送信中は送る無効 | 実装済み |
| 送信後は入力クリア＋フォーカス維持 | 実装済み（一覧は `onSnapshot` で反映） |
| クライアント送信上限 | `COMMUNICATION_CLIENT_MESSAGE_SEND_LIMIT`（50件／スレッド内・クライアント発）。API と UI で同一判定 |
| 既読（スレッド親＋メッセージ） | **実装済み**。チャット最下部が見えたら `POST /api/communication/board/read`。親の `*LastReadAt` と相手メッセージの `readAt` を更新。送信側に「既読」表示 |
| 未読 `New` | コーチ: クライアント選択行・共有ボタン付近・メッセージボードタブ。クライアント: サイドバー「コミュニケーション」・メッセージボードタブ。取得は表示時（ライブ監視なし）。ボード専用（アファメ要対応とは別） |
| プレミアムのみ（クライアント） | `communication.message_board` |
| プレミアム→スタンダード後 | **即時**に送信・編集不可。**履歴閲覧は可**（`dataRetentionEndsAt` まで） |
| コーチ: 未選択時は案内＋入力不可、初回はクライアントピッカー | `CoachClientPickerModal` |
| 管理者: 右上対象者非表示 | 実装済み |
| 右上: `displayName` / `photoURL` | クライアント: 割当コーチ。コーチ: 選択クライアント |
| リアルタイム更新 | **`tab=board` かつ peer 確定時のみ** `subscribeCommunicationBoardMessages` |
| コーチ共有データ境界（1行） | `COACH_SHARED_JOURNAL_VISIBILITY_RULE` を画面下部に注記 |

---

## API（Phase B4）

| メソッド | パス | 内容 |
|----------|------|------|
| POST | `/api/communication/board/message` | 送信（Firestore 永続化・スレッド親の lastMessage* 更新） |
| PATCH | `/api/communication/board/message/{id}` | 編集（本人のメッセージのみ） |
| POST | `/api/communication/board/read` | 既読（最下部到達時。親 LastReadAt ＋相手メッセージ readAt） |

**ガード（共通）**: Bearer → クライアントは `communication.message_board`、コーチは role 判定 → `coach_client_assignments/{coachUid}_{clientUid}` が `active`。

**エラーコード**: `PREMIUM_REQUIRED` / `NOT_ASSIGNED_COACH` / `FORBIDDEN_PEER` / `SEND_LIMIT` / `NOT_FOUND`

決定の正本: [04_PHASE_B_API_INTERNAL_DECISIONS.md](./04_PHASE_B_API_INTERNAL_DECISIONS.md) §5。

---

## 残作業

1. **送信上限**: 日次／月次リセットやプラン別上限（現状はスレッド内累計50件）
2. **データ削除**: `dataRetentionEndsAt` 経過後の `communication_board_threads` バッチ削除（方針は [04_SUBSCRIPTION_PRODUCT_SCOPE.md](./04_SUBSCRIPTION_PRODUCT_SCOPE.md) §4.1）
3. **館長から**: ダミーから本番データへ
4. **未読メタのバックフィル**（任意）: 導入前の既存スレッドは、次の送受信まで `lastMessage*` が無く New が出ない場合あり

サブスク仕様の**正本・索引**は [01_ROLES_AND_SUBSCRIPTION_DESIGN.md](./01_ROLES_AND_SUBSCRIPTION_DESIGN.md) の **§6.1**。

---

## 関連ソース（ファイル）

| 種別 | パス |
|------|------|
| ページエントリ | `src/app/communication/page.tsx`（`Suspense`） |
| 画面ロジック | `src/components/communication/CommunicationPageClient.tsx` |
| 購読・型 | `src/lib/communicationBoard.ts` |
| 未読判定 | `src/lib/communicationBoardUnread.ts` / `src/hooks/useBoardUnread.ts` |
| API ガード | `src/lib/server/communicationBoardAccess.ts` |
| 定数 | `src/lib/communicationConstants.ts` |
| API | `src/app/api/communication/board/message/route.ts`、`…/[id]/route.ts`、`…/read/route.ts` |
| スタイル | `src/styles/home-trial.css`（`.communication-*` / `.board-unread-new`） |
| クライアントピッカー | `src/components/trial/CoachClientPickerModal.tsx`（行に New） |
| 割当参照 | `src/lib/coachAffirmationShare.ts` |
| ルール | `firestore.rules`（`communication_board_threads`、`users` read 逆方向） |

---

## ホーム画面との関連（レイアウト・マネジメント）

本ドキュメント対象外だが、同一リリース周期での変更として以下を参照する。

- **セクション区切り・幅狭時のカラム順**: [04_HOME_SCREEN_IMPLEMENTATION.md](./04_HOME_SCREEN_IMPLEMENTATION.md) の「レイアウト更新（2026-05）」。
- **今週の実施状況のコンパクトグリッド**: `HomeDashboard.tsx` + `home-trial.css`。

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-08-04 | 未読 New（案C）・既読 API（最下部到達）・共有ボタン／ピッカー／サイドバー表示。ボード専用。 |
| 2026-05-12 | 初版: コミュニケーション UI・定数・プレミアム暫定フラグ・サブスク差し込みメモ。 |
| 2026-05-12 | Zoom 別アプリ・運用再検討・スコープ外ドキュメントへの参照を追記。 |
| 2026-05-17 | プレミアム判定を entitlement に更新。プレミアム→スタンダード時の Q&A 挙動を追記。 |
| 2026-07-06 | メッセージボード Firestore 永続化・`onSnapshot`（表示中のみ）・API 接続・コーチ権限・データモデル・共有プロセスを反映。デモメッセージ廃止。 |
