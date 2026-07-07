# Phase B — API 内部仕様（決定）

## 目的

Phase B（Next.js Route Handlers を中心とした API 層）に着手する際の **内部仕様を固定**する。プロダクト要件は [04_SUBSCRIPTION_PRODUCT_SCOPE.md](./04_SUBSCRIPTION_PRODUCT_SCOPE.md)、データ正本は `users/{uid}.subscription` と [03_FIRESTORE_DATABASE_STRUCTURE.md](./03_FIRESTORE_DATABASE_STRUCTURE.md) §2.1、entitlement 解決は `src/lib/subscription/resolveEntitlements.ts` に従う。

**決定権**: 実装都合・セキュリティのデフォルトとして本書で確定する。変更する場合は本書と実装を同時に更新する。

---

## 1. 横断（全 B ステップ共通）

| 項目 | 決定内容 |
|------|----------|
| **エラー JSON** | HTTP 4xx/5xx 時は次の形に統一する: `{ "error": { "code": string, "message"?: string, "feature"?: string } }`。`feature` は `ENTITLEMENT_DENIED` 等で **FeatureKey** を返すときのみ付与。 |
| **認証（ユーザー API）** | Firebase **ID Token** を `Authorization: Bearer <idToken>` で送る。Route Handler 側で `firebase-admin` の `verifyIdToken` を実行し UID を確定する。 |
| **Admin SDK の配置** | **Next.js Route Handlers**（`src/app/api/**`）から **Firebase Admin** を初期化して `users/{uid}` を読む（新規 `src/lib/firebaseAdmin.ts` 等に集約）。**Stripe Webhook** は [04_SUBSCRIPTION_PRODUCT_SCOPE.md](./04_SUBSCRIPTION_PRODUCT_SCOPE.md) 付録 C のとおり **Cloud Functions** を正とする（本番の課金状態更新は Next に置かない）。 |
| **`SubscriptionContext` の扱い** | **B1 実装と同時**に、`useAuth().userProfile.subscription` と **`resolveEntitlements`** を参照するよう **一本化**する（[04_IMPLEMENTATION_STEPS_DB_AND_AUTH.md](./04_IMPLEMENTATION_STEPS_DB_AND_AUTH.md) Phase A 注意の解消）。 |

---

## 2. B1 — `GET /api/me/subscription`

| 項目 | 決定内容 |
|------|----------|
| **パス** | **`GET /api/me/subscription`** を正とする（session への埋め込みは行わない。Next の Server Component から必要なら同一 Route を `fetch` する）。 |
| **レスポンス** | 少なくとも次を含む JSON: `plan`, `status`, `trialEndsAt`, `currentPeriodEnd`, `stripeCustomerId`, `stripeSubscriptionId`（未設定は `null` 省略可）、**`entitlements`**（`Record<FeatureKey, boolean>`、`resolveEntitlements` の出力そのまま）。クライアント表示用の **派生フィールド**（例: `effectiveKizukiTier`）は **返さない**（重複を避け、計算は `resolveEntitlements` とクライアントの既存ロジックに限定）。必要になったら B1 のマイナーバージョンで追加。 |
| **キャッシュ** | `Cache-Control: private, no-store`（課金・失効とずれないよう常に最新を優先）。 |
| **日付表現** | JSON では **ISO 8601（UTC）文字列**（例: `2026-05-12T15:00:00.000Z`）。画面の「残り日数」は **クライアントで `Asia/Tokyo`** に変換する。 |

---

## 3. B2 — `/api/ai/*` の entitlement

| 項目 | 決定内容 |
|------|----------|
| **対象** | `src/app/api/ai/**/route.ts` の **すべて**（現状の `weekly-report` / `monthly-report` に加え、将来追加される同階層の AI ルートも含む）。 |
| **未認証** | **401**。`error.code`: **`UNAUTHENTICATED`**。 |
| **権限不足（プラン・トライアル含む）** | **403**。`error.code`: **`PLAN_REQUIRED`**（汎用。クライアントは「アップグレード案内」を出せればよい）。 |
| **機能キー単位で区別したい場合** | 同一 403 で **`error.feature`** に要求した **FeatureKey** を載せる（例: `kizuki.weekly.ai_report`）。別コード `ENTITLEMENT_DENIED` は **使わない**（コード種類を増やしすぎない）。 |
| **検証手順** | ① Bearer 検証 → ② Admin で `UserProfile` 取得 → ③ `resolveEntitlements(profile)` → ④ 当ルートが要求する `FeatureKey` が `true` か。 |
| **開発用バイパス** | サーバー環境変数 **`MANABIBA_DISABLE_AI_ENTITLEMENT_CHECK=true`** のときのみチェックをスキップする。**デフォルトは未定義＝チェック有効**。`.env.local` のみに書き、**本番・ステージングでは絶対に設定しない**。 |

---

## 4. B3 — 気づきノート書き込み（rules ＋ サーバー）

| 項目 | 決定内容 |
|------|----------|
| **書き込み経路** | **当面はクライアント SDK の直接 write を維持**する（既存の `journal_*` 実装との整合）。 |
| **正のガード** | **Firestore Security Rules を第一正**。ルール内で `get(/databases/$(database)/documents/users/$(request.auth.uid))` により **`subscription` を読み**、TypeScript の `resolveEntitlements` と **同値になる条件式**をルール側に書く（**二重定義**になるため、`featureKeys` と判定式の変更は **必ず TS と rules をペアで更新**することを [firestore.rules](../../firestore.rules) 先頭コメントに明記する）。 |
| **サーバー側** | **journal への書き込みを行う Route Handler / Server Action を新設する場合のみ**、その中で再度 `resolveEntitlements` を実行して拒否する（二重ガード）。 |
| **read / write の方針** | **本人 read** は `journal_*` について **原則維持**（閲覧のみフェーズでも自分のデータは読める）。**write**（create/update）は **`resolveEntitlements` でいずれかの `kizuki.*` が true のときのみ許可**する（＝トライアル失効後の「入力ロック」と一致。AI だけでなく入力保存も同一条件にそろえる）。 |
| **新規フリーと `trialEndsAt`** | B3 の write 条件と `resolveEntitlements` を一致させるため、**新規 `createDefaultUserProfile` 時点で `trialEndsAt` を付与**する（実装済み: 登録から **28×24 時間**後。暦日 **JST 起点の厳密 28 日**は後続で `trialEndsAt` 設定処理を共通化して差し替え可）。**既存ユーザー**で `trialEndsAt` が欠ける場合は **一度限りのマイグレーション**または **手動で Firestore 補完**する。 |

---

## 5. B4 — コミュニケーション（POST / PATCH / 既読）

| 項目 | 決定内容 |
|------|----------|
| **ミューテーションの経路** | **Next.js Route Handlers** を正とする（`POST/PATCH /api/communication/board/message`）。**クライアントは Firestore に直接書かない**。 |
| **読み取り** | **クライアント SDK の `onSnapshot`**（`communication_board_threads/…/messages`）。**`tab=board` 表示中のみ** subscribe し、離脱時に unsubscribe（[04_COMMUNICATION_SCREEN_IMPLEMENTATION.md](./04_COMMUNICATION_SCREEN_IMPLEMENTATION.md)）。 |
| **永続化** | `communication_board_threads/{coachUid}_{clientUid}/messages/{id}`（2026-07 実装済み） |
| **割当の正本** | ルートコレクション **`coach_client_assignments`**。ドキュメント ID **`{coachUid}_{clientUid}`**、`status == 'active'` を **担当あり**とみなす（[03_A11_COACH_SHARING_SCHEMA_DRAFT.md](./03_A11_COACH_SHARING_SCHEMA_DRAFT.md)）。 |
| **ガード条件** | ① Bearer 検証 → ② **クライアント**は `resolveEntitlements` の **`communication.message_board`** が true。**コーチ**（`role` が coach / senior_coach）はプレミアム不要 → ③ **active 割当**が存在すること。満たさない場合は **403**。 |
| **エラーコード** | `PREMIUM_REQUIRED`（message_board false）、`NOT_ASSIGNED_COACH`（割当がない／相手が担当外）、`FORBIDDEN_PEER`（スレッドの当事者以外）、`SEND_LIMIT`（クライアント上限）。 |
| **送信上限・既読** | クライアント上限は `COMMUNICATION_CLIENT_MESSAGE_SEND_LIMIT`（API 内で検証済み）。**既読のサーバー更新は未実装**。 |

---

## 6. B5 — 外部出力（将来）

| 項目 | 決定内容 |
|------|----------|
| **Phase B のスコープ** | **コード実装しない**。要件・用語は [04_SUBSCRIPTION_PRODUCT_SCOPE.md](./04_SUBSCRIPTION_PRODUCT_SCOPE.md) に既記載のとおり「次ステップ」。 |
| **将来実装時の方針メモ** | **Premium のみ**、**非同期ジョブ**（Cloud Tasks 等）＋**署名付き URL**、個人情報の **マスキング方針は別紙**で確定する。 |

---

## 7. Phase B での検証内容（チェックリスト）

実装完了後、**少なくとも次を満たすこと**を Phase B の完了条件とする。検証は **テスト用 Firebase プロジェクト**またはエミュレータ＋**Firestore の `subscription` を手動変更**でプランを切り替えて行う（Stripe は不要）。

### 7.1 横断

| # | 検証内容 | 期待結果 |
|---|----------|----------|
| T1 | 有効な Bearer で保護 API を呼ぶ | 200 または業務エラー（4xx は仕様どおりの `error.code`） |
| T2 | Bearer なし／不正トークン | **401**、`error.code === 'UNAUTHENTICATED'` |
| T3 | レスポンス JSON のエラー形 | `{ "error": { "code", "message?", "feature?" } }` に一致 |
| T4 | `SubscriptionContext` が **`userProfile.subscription` と整合** | プラン変更後、UI のプラン表示・`canUseFeature` 相当が Firestore と一致（B1 実装時） |

### 7.2 B1 — `GET /api/me/subscription`

| # | 検証内容 | 期待結果 |
|---|----------|----------|
| B1-1 | ログイン済みで GET | `plan` / `status` / 日付系が **ISO UTC** または `null`。`entitlements` が **`resolveEntitlements` と同一** |
| B1-2 | レスポンスヘッダ | `Cache-Control` に **`private, no-store`** が含まれる |
| B1-3 | `free` かつ `trialEndsAt` が未来 | `kizuki.*` がすべて **true**、`communication.message_board` は **false**（現行マッピング） |
| B1-4 | `standard` / `premium`（`status: active`） | `premium` のとき **`communication.message_board` が true** |

### 7.3 B2 — `/api/ai/*`

| # | 検証内容 | 期待結果 |
|---|----------|----------|
| B2-1 | 各 AI ルートで **権限ありユーザー** | **200**、従来どおり AI 処理が通る |
| B2-2 | 権限なし（例: `free` かつ `trialEndsAt` 削除または過去） | **403**、`error.code === 'PLAN_REQUIRED'`、必要なら **`error.feature`** に当該 FeatureKey |
| B2-3 | 未認証 | **401**、`UNAUTHENTICATED` |
| B2-4 | `MANABIBA_DISABLE_AI_ENTITLEMENT_CHECK=true`（ローカルのみ） | ガードがスキップされる。**未設定時は必ずガード有効** |
| B2-5 | `MANABIBA_DISABLE_AI_ENTITLEMENT_CHECK` を本番ビルドに含めない | 本番環境変数に当該キーが**無い**こと（運用チェック） |

### 7.4 B3 — `journal_*` と rules

| # | 検証内容 | 期待結果 |
|---|----------|----------|
| B3-1 | **`kizuki.*` いずれか true** のユーザー | `journal_daily` / `weekly` / `monthly` へ **create/update 成功**（クライアント SDK） |
| B3-2 | **すべて false**（例: トライアル終了後に `trialEndsAt` を過去へ） | **write が rules で拒否**、read は本人なら **可能** |
| B3-3 | 他人の `uid` 配下の `journal_*` | **read/write とも拒否**（既存方針の維持） |
| B3-4 | `resolveEntitlements` のロジック変更時 | **同じ変更を rules に反映**したうえで B3-1/B3-2 を再実行（ペア更新の検証） |

### 7.5 B4 — コミュニケーション API

| # | 検証内容 | 期待結果 |
|---|----------|----------|
| B4-1 | **premium** かつ **active 割当**があるペアで POST/PATCH | **200**（または設計どおりの成功） |
| B4-2 | `standard` のみ（message_board false） | **403**、`PREMIUM_REQUIRED` |
| B4-3 | premium だが **割当なし／別コーチ** | **403**、`NOT_ASSIGNED_COACH` または `FORBIDDEN_PEER`（仕様どおり） |
| B4-4 | 送信上限・既読 | [04_COMMUNICATION_SCREEN_IMPLEMENTATION.md](./04_COMMUNICATION_SCREEN_IMPLEMENTATION.md) の定数どおりにブロックまたは成功 |

### 7.6 B5・回帰

| # | 検証内容 | 期待結果 |
|---|----------|----------|
| — | B5 外部出力 | **検証対象外**（未実装） |
| R1 | ログイン・ホーム・トライアル既存フロー | Phase B 変更後も **退行がない**（スモーク） |
| R2 | `npm run build` | **成功** |

---

## 8. 参照

- [04_IMPLEMENTATION_STEPS_DB_AND_AUTH.md](./04_IMPLEMENTATION_STEPS_DB_AND_AUTH.md)（Phase A・Phase B ステップ表）
- [04_SUBSCRIPTION_PRODUCT_SCOPE.md](./04_SUBSCRIPTION_PRODUCT_SCOPE.md)
- [04_COMMUNICATION_SCREEN_IMPLEMENTATION.md](./04_COMMUNICATION_SCREEN_IMPLEMENTATION.md)
- [03_FIRESTORE_DATABASE_STRUCTURE.md](./03_FIRESTORE_DATABASE_STRUCTURE.md)
- `src/lib/subscription/`

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-05-12 | 初版: Phase B 内部仕様（B1〜B5・横断）を確定。 |
| 2026-05-12 | §7: Phase B 検証チェックリスト。§8 を参照索引に変更。 |
| 2026-07-06 | §5 B4: メッセージボード Firestore 永続化・onSnapshot 読取・コーチ権限を実装反映。 |
