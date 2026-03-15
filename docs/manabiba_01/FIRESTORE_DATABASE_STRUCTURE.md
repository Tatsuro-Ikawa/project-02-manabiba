# Firestore データベース構造（現状）

## 📋 目的

現時点で想定・利用している **Firestore のコレクション構成と主要フィールド** を一覧にしたドキュメントです。実装やホーム用データ追加時の参照用です。

- **コレクション一覧**: [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) の「6.1 Firestoreコレクション構造」と、[FIRESTORE_SECURITY_RULES_SETUP.md](../FIRESTORE_SECURITY_RULES_SETUP.md) のルールで定義されているパスをベースに整理。
- **セキュリティルールの詳細**: [FIRESTORE_SECURITY_RULES_SETUP.md](../FIRESTORE_SECURITY_RULES_SETUP.md) を参照。

---

## 1. コレクション構成（ツリー）

```
（ルート）
├── users/
│   └── {uid}                          # ユーザープロファイル（1ユーザー1ドキュメント）
│       ├── smart-goals/
│       │   └── {goalId}               # SMART目標（サブコレクション）
│       ├── theme-selection/
│       │   └── {sessionId}            # テーマ選択セッション（設計書に記載）
│       ├── self-understanding/        # 自己理解データ（設計書に記載）
│       ├── coaching-program/         # コーチングプログラム進捗（設計書に記載）
│       │   ├── 7day-program/
│       │   └── 28day-trial/{date}
│       └── progress                   # 進捗データ（設計書に記載）
│
├── pdca_entries/
│   └── {entryId}                      # PDCAエントリ（uid でユーザー紐付け）
│
├── pdca_aggregations/
│   └── {aggregationId}                # PDCA集約データ（週・月単位）
│
├── coaching_sessions/
│   └── {sessionId}                    # コーチングセッション（userId で紐付け）
│
├── goals/
│   └── {goalId}                       # 目標（userId で紐付け）
│
├── ai_analyses/
│   └── {analysisId}                   # AI分析（userId で紐付け）
│
├── coaching_settings/
│   └── {userId}                       # コーチング設定（1ユーザー1ドキュメント）
│
└── site_content/                      # サイト共通コンテンツ（ホーム用。管理者が編集）
    └── home                           # ホーム画面用 1 ドキュメント（最新動画・参考リンク・最新記事・広告等）
```

- **site_content / home**: ホーム画面の「最新動画」「参考リンク」「最新記事」「広告」など、管理者が編集する共通コンテンツを 1 ドキュメントで持つ想定。読み取りは未認証含む全員可、書き込みは管理者（admin）のみ。フィールド例は下記「2.x site_content / home」を参照。

---

## 2. 各コレクション・ドキュメントの主要フィールド

### 2.1 users / {uid}（ユーザープロファイル）


| フィールド        | 型（想定）              | 説明                                               |
| ------------ | ------------------ | ------------------------------------------------ |
| uid          | string             | Firebase Auth の UID（ドキュメントIDと一致）                 |
| email        | string             | メールアドレス                                          |
| displayName  | string             | 表示名                                              |
| photoURL     | string | undefined | プロフィール画像URL                                      |
| role         | string             | ロール: `user` | `coach` | `senior_coach` | `admin` |
| subscription | map                | サブスクリプション情報（下記）                                  |
| createdAt    | Timestamp          | 作成日時                                             |
| updatedAt    | Timestamp          | 更新日時                                             |
| lastLoginAt  | Timestamp          | 最終ログイン日時                                         |


**subscription（サブオブジェクト）**


| フィールド     | 説明                                              |
| --------- | ----------------------------------------------- |
| plan      | `free` | `standard` | `premium` 等               |
| status    | `active` | `inactive` | `cancelled` | `expired` |
| startDate | 開始日                                             |
| features  | pdca, aiComments, coachComments 等の boolean      |
| usage     | pdcaEntries, aiComments 等の利用数                   |


- 実装: `src/lib/firestore.ts` の `createDefaultUserProfile` / `createUserProfile` / `getUserProfile`、型は `src/types/auth.ts` の `UserProfile`。

#### ログイン時のデータの流れ（入出力）

| タイミング | 処理 | データの入り先 |
|------------|------|----------------|
| **初回ログイン** | Firebase Authentication で Google ログイン後、`AuthContext` が `getUserProfile(uid)` を実行 | まだドキュメントが無いため `createDefaultUserProfile(user)` が呼ばれる |
| **createDefaultUserProfile** | `users/{uid}` に 1 ドキュメントを作成 | **Firestore の `users` コレクション**。ドキュメント ID = Firebase Auth の UID。フィールドに `uid`, `email`, `displayName`, `photoURL`, **`role`（初期値 `'user'`）**, `subscription` 等を保存 |
| **2回目以降のログイン** | `getUserProfile(uid)` で既存ドキュメントを取得 | 上記 `users/{uid}` から読み取り。`updateLastLogin(uid)` で `lastLoginAt` を更新 |

- ロールの判定は **`users/{uid}.role`** を参照している。このフィールドを `user` / `coach` / `admin` に設定することで、クライアント・ホスト・管理者の区別ができる。

---

### 2.2 users / {uid} / smart-goals / {goalId}


| フィールド | 説明                     |
| ----- | ---------------------- |
| uid   | ユーザーID（作成者）            |
| （その他） | SMART目標のタイトル・内容・ステータス等 |


- セキュリティ: 本人のみ read/write。

---

### 2.3 pdca_entries / {entryId}


| フィールド                               | 説明       |
| ----------------------------------- | -------- |
| uid                                 | ユーザーID   |
| date                                | 日付（文字列等） |
| plan, do, check, action             | PDCA 各項目 |
| weekOfYear, monthOfYear, year       | 集約用      |
| comments, coachComments, aiComments | コメント     |
| createdAt, updatedAt                | 日時       |


- 実装: `src/lib/firestore.ts` の `PDCAData` 型、`getPDCAEntry` 等。

---

### 2.4 pdca_aggregations / {aggregationId}


| フィールド              | 説明                   |
| ------------------ | -------------------- |
| uid                | ユーザーID               |
| period             | `weekly` | `monthly` |
| startDate, endDate | 集計期間                 |
| summary            | 集約結果（件数・達成率等）        |


---

### 2.5 coaching_sessions / {sessionId}


| フィールド       | 説明                                          |
| ----------- | ------------------------------------------- |
| userId      | ユーザーID                                      |
| sessionType | `coaching` | `goalSetting` | `aiAnalysis` 等 |
| sessionDate | セッション日時                                     |
| notes       | メモ                                          |


---

### 2.6 goals / {goalId}


| フィールド              | 説明                                          |
| ------------------ | ------------------------------------------- |
| userId             | ユーザーID                                      |
| title, description | 目標内容                                        |
| status             | `notStarted` | `inProgress` | `completed` 等 |
| dueDate            | 期限                                          |


---

### 2.7 ai_analyses / {analysisId}


| フィールド        | 説明       |
| ------------ | -------- |
| userId       | ユーザーID   |
| （分析結果のフィールド） | 仕様に応じて定義 |


---

### 2.8 coaching_settings / {userId}


| フィールド  | 説明                  |
| ------ | ------------------- |
| userId | ユーザーID（ドキュメントIDと一致） |
| （設定項目） | コーチング関連の設定          |


---

### 2.9 site_content / home（ホーム画面用・登録案）

ホームの「最新動画」「参考リンク」「最新記事」「広告」などを保存するための **1 ドキュメント**。管理者のみ書き込み可、表示用の読み取りは未認証含む全員可を想定。

| フィールド | 型（想定） | 説明 |
|------------|------------|------|
| **latestVideos** | 配列 | 最新動画一覧。各要素: `{ url, title, thumbnailUrl, order, author_name?, author_url? }`（`author_name` / `author_url` は oEmbed 取得値。ホームで「作成者」表示に利用） |
| **referenceLinks** | 配列 | いちおしサイト一覧。各要素: `{ url, title?, siteName, thumbnailUrl, order }`（OGP 流用で URL から取得。表示は縦並び・タイトル・サイト名） |
| **latestArticles** | 配列 | 最新記事一覧。各要素: `{ url, title, lead, source, thumbnailUrl, order }`（見出し・リード・出所・サムネイル） |
| **ad** | map または string | 広告エリアの内容（項目は後で定義） |
| **updatedAt** | Timestamp | 最終更新日時（管理者が保存したとき） |

- 上記は **登録が必要となる DB の案**。セキュリティルールに `site_content/home` 用の read（全員可）・write（isAdminUser()）を追加済み。
- **実装**: `src/lib/firestore.ts` に `HomeContent`・`HomeLatestVideoEntry`・`HomeLatestArticleEntry`・`HomeReferenceLinkEntry` 型、`getHomeContent()`・`updateHomeLatestVideos()`・`updateHomeLatestArticles()`・`updateHomeReferenceLinks()` を実装。ホームは `getHomeContent()` で取得。おすすめ動画は `/api/youtube-oembed`、注目記事・いちおしサイトは `/api/article-ogp` を流用して編集モーダルから保存。広告（ad）の編集 UI は未実装。

---

## 3. ユーザー登録とロールの手動設定（テスト用）

現段階では、**ロールの変更は Firestore コンソールで手動**で行う。管理者が画面からロールを変更する機能は後で実装する想定。

### 3.1 テスト用アカウントとロールの対応

| 種別 | メールアドレス | Firestore の `role` の値 |
|------|----------------|---------------------------|
| クライアント | jayhasa.academy@gmail.com | `user`（初回ログイン時から自動で入る） |
| ホスト | inet.hp1@gmail.com | `coach`（手動で設定） |
| 管理者 | bizitems.567@gmail.com | `admin`（手動で設定） |

- いずれも **Google で 1 回ずつログイン**すると、`users/{uid}` が自動作成され、初期値で `role: 'user'` になる。
- ホスト・管理者として使うアカウントは、**作成後に Firestore で `role` を `coach` または `admin` に書き換える**。

### 3.2 Firestore でロールを手動設定する手順

1. **各アカウントで 1 回ログインする**  
   アプリで上記 3 アドレスのどれかで Google ログインし、`users` にドキュメントができることを確認する。

2. **Firebase コンソールを開く**  
   - https://console.firebase.google.com/ → プロジェクト `plandosee-project-01` を選択  
   - 左メニュー **「Firestore Database」** → **「データ」** タブ

3. **`users` コレクションを開く**  
   - コレクション一覧で **`users`** をクリック  
   - ドキュメント一覧が表示される。ドキュメント ID が **Firebase Auth の UID**（長い英数字の文字列）になっている。

4. **どのドキュメントが誰か確認する**  
   - 各ドキュメントを開き、**`email`** フィールドの値で判定する。  
     - jayhasa.academy@gmail.com → そのドキュメントの `role` は **そのまま `user`**（変更不要）  
     - inet.hp1@gmail.com → このドキュメントの **`role` を `coach` に変更**  
     - bizitems.567@gmail.com → このドキュメントの **`role` を `admin` に変更**

5. **`role` フィールドを編集する**  
   - 対象ドキュメントをクリックして開く  
   - **`role`** フィールドの値をクリックし、`user` → `coach` または `admin` に書き換える  
   - 保存（Firestore は編集すると自動保存）

6. **アプリで確認する**  
   - 該当アカウントでログアウトしてから再度ログインする（またはページをリロードする）。  
   - ヘッダーなどの「ロール」「モード」表示が、設定した `role` に応じて変わることを確認する。

### 3.3 role に指定する値（まとめ）

| 値 | 意味 |
|----|------|
| `user` | クライアント（一般ユーザー） |
| `coach` | ホスト（コーチ） |
| `admin` | 管理者 |

- 型定義（`src/types/auth.ts`）では `senior_coach` もあるが、現状の運用では **`user` / `coach` / `admin`** の 3 種でよい。
- ロール変更の管理画面（管理者が他ユーザの `role` を変更する機能）は、別途実装する。

---

## 4. セキュリティルールで保護されているパス（要約）


| パス                                  | read          | write |
| ----------------------------------- | ------------- | ----- |
| users/{userId}                      | 本人のみ          | 本人のみ  |
| users/{userId}/smart-goals/{goalId} | 本人のみ          | 本人のみ  |
| pdca_entries/{entryId}              | 認証済み＆自分のデータ   | 同上    |
| pdca_aggregations/{aggregationId}   | 同上            | 同上    |
| coaching_sessions/{sessionId}       | 同上（userId 一致） | 同上    |
| goals/{goalId}                      | 同上            | 同上    |
| ai_analyses/{analysisId}            | 同上            | 同上    |
| coaching_settings/{userId}          | 本人のみ          | 本人のみ  |


- 詳細なルール文は [FIRESTORE_SECURITY_RULES_SETUP.md](../FIRESTORE_SECURITY_RULES_SETUP.md) を参照。

---

## 5. ホーム用データを追加する場合

- **新規コレクション例**: `site_content`（または `home_sections` 等）。
- **例**: `site_content/home` ドキュメントに、参考リンク・最新動画・最新記事・広告用のフィールドを格納。
- **権限**: 読み取りは未認証含む全員可、書き込みは管理者（admin）のみ、とする想定。ルールでは `users/{uid}` の `role` を参照して admin 判定する必要がある。
- 詳細は [HOME_SCREEN_IMPLEMENTATION.md](./HOME_SCREEN_IMPLEMENTATION.md) の「4. 実装前に確認しておく事項」を参照。

---

## 6. 参照ドキュメント


| ドキュメント                                                                    | 内容                                                              |
| ------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)                        | 6.1 Firestoreコレクション構造（ツリー）                                      |
| [FIRESTORE_SECURITY_RULES_SETUP.md](../FIRESTORE_SECURITY_RULES_SETUP.md) | セキュリティルール全文・保護コレクション一覧                                          |
| [HOME_SCREEN_IMPLEMENTATION.md](./HOME_SCREEN_IMPLEMENTATION.md)          | ホーム用データの保存先・スキーマ検討                                              |
| 実装                                                                        | `src/lib/firestore.ts`（型・CRUD）、`src/types/auth.ts`（UserProfile） |


