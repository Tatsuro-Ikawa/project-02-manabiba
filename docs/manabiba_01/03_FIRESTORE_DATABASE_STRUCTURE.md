# Firestore データベース構造（現状）

## 📋 目的

現時点で想定・利用している **Firestore のコレクション構成と主要フィールド** を一覧にしたドキュメントです。実装やホーム用データ追加時の参照用です。

- **コレクション一覧**: [02_SYSTEM_ARCHITECTURE.md](./02_SYSTEM_ARCHITECTURE.md) の「6.1 Firestoreコレクション構造」と、[FIRESTORE_SECURITY_RULES_SETUP.md](../FIRESTORE_SECURITY_RULES_SETUP.md) のルールで定義されているパスをベースに整理。
- **セキュリティルールの詳細**: [FIRESTORE_SECURITY_RULES_SETUP.md](../FIRESTORE_SECURITY_RULES_SETUP.md) を参照。
- **A-11（2026-03-28）**: コーチ共有の **データ構造・フィールド名** を本書に反映（`coach_client_assignments`、`coach_share_rounds`、`coach_comment_versions`、`activeCoachingAffirmationId`、親 `affirmations` の共有メタ）。**ルール実装は未着手**。正本の説明は [03_A11_COACH_SHARING_SCHEMA_DRAFT.md](./03_A11_COACH_SHARING_SCHEMA_DRAFT.md)。

---

## 1. コレクション構成（ツリー）

```
（ルート）
├── coach_client_assignments/          # コーチ↔クライアント割当（A-11 現状案）
│   └── {assignmentId}
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
│       ├── journal_daily/             # マネジメント日誌（学び帳）日次: 朝・晩
│       │   └── {dateKey}              # YYYY-MM-DD（JST）
│       ├── journal_weekly/            # マネジメント日誌（学び帳）週次（週報）
│       │   └── {weekStartKey}         # その週の開始日 YYYY-MM-DD（JST・設定の週始まり）
│       ├── journal_monthly/           # マネジメント日誌（学び帳）月次（月報）
│       │   └── {monthKey}             # YYYY-MM（JST・暦月）
│       ├── affirmation_drafts/        # アファメーション穴埋め下書き（暗号化スロット）
│       │   └── {profileId}
│       ├── affirmation_profiles/      # ユーザー定義・改変プロファイル（将来）
│       │   └── {profileId}
│       ├── affirmations/              # アファメーション（親＝メタ、案 B）
│       │   └── {affirmationId}        # 親: メタは主に平文（§2.13）。本文の暗号化は子へ。
│       │       ├── published/         # 各 doc に encryptedBody（発行済み本文）
│       │       │   └── {docId}        # 例: current
│       │       ├── history/           # 各 doc に encryptedBody / encryptedTitle（履歴）
│       │       │   └── {historyId}
│       │       └── coach_share_rounds/    # A-11: クライアント「コーチへ送信」1回につき1 doc
│       │           └── {roundId}
│       │               └── coach_comment_versions/  # コーチコメントの版（追記のみ・履歴）
│       │                   └── {versionId}
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
├── affirmation_profiles/              # システム定義アファメーションプロファイル（管理者が編集）
│   └── {profileId}                    # 穴埋めテンプレート（Markdown [[slotId:n]] 等）。read: 認証ユーザ想定、write: admin
│
└── site_content/                      # サイト共通コンテンツ（ホーム用。管理者が編集）
    └── home                           # ホーム画面用 1 ドキュメント（おすすめ動画・いちおしサイト・注目記事・広告等）
```

- **site_content / home**: ホーム画面の「最新動画」「参考リンク」「最新記事」「広告」など、管理者が編集する共通コンテンツを 1 ドキュメントで持つ想定。読み取りは未認証含む全員可、書き込みは管理者（admin）のみ。フィールド例は下記「2.x site_content / home」を参照。

---

## 2. 各コレクション・ドキュメントの主要フィールド

### 2.x users / {uid} / journal_daily / {dateKey}（マネジメント日誌: 日次 朝・晩）

- **パス**: `users/{uid}/journal_daily/{dateKey}`（`dateKey = YYYY-MM-DD`、`tz = Asia/Tokyo`）
- **目的**: マネジメント日誌（学び帳）の「朝・晩」記録（SCREEN-005）。28日無料トライアル開始時も同一コレクションを利用し、サブスク継続後もそのまま蓄積する。
- **暗号化**: 自由記述は **`encrypt(plaintext, uid)`** で暗号化して保存し、読み込み時に復号する。

| フィールド | 型（想定） | 説明 |
|------------|------------|------|
| dateKey | string | `YYYY-MM-DD` |
| tz | string | 固定 `Asia/Tokyo` |
| morningAffirmationDeclaration | string \| null | `'done' \| 'undone'`（画面は「完了」チェックのみ。未チェックは `undone`） |
| morningTodayActionTextEncrypted | string \| null | 朝「今日の行動」の統合欄（下位の目標・内容欄と併存し得る。実装の正本は `src/lib/firestore.ts` の `Trial4wDaily*`） |
| morningActionGoalTextEncrypted | string \| null | 今日の行動 — 目標 |
| morningActionContentTextEncrypted | string \| null | 今日の行動 — 行動内容 |
| morningImagingDone | bool \| null | 「今日の行動のイメージング」完了 |
| eveningExecution | string \| null | `'done' \| 'partial' \| 'none'`（「今日の行動内容（目標）の実行」） |
| eveningSpecificActionsTextEncrypted | string \| null | 「具体的な行動内容」（execution が done/partial のとき表示） |
| eveningResultTextEncrypted | string \| null | 「行動の成果への振り返り」 |
| eveningResultExecutionTextEncrypted | string \| null | 行動の実行状況の補足 |
| eveningResultGoalProgressTextEncrypted | string \| null | 目標に対する進捗・結果 |
| eveningSatisfaction | number \| null | 0〜10 |
| eveningEmotionThoughtTextEncrypted | string \| null | 「行動時の感情・思考」 |
| eveningBrake | string \| null | `'yes' \| 'partial' \| 'no'`（「こころのブレーキの作動」） |
| eveningBrakeRebuttalChoice | string \| null | `'done' \| 'partial' \| 'none'`（ブレーキ作動時の反論可否の選択） |
| eveningRebuttalTextEncrypted | string \| null | 旧・反論まとめ欄（移行・互換。新 UI では分割欄を優先） |
| eveningBrakeWorkedTextEncrypted | string \| null | ブレーキがどう働いたか |
| eveningBrakeRebuttedTextEncrypted | string \| null | 反論の有無・内容 |
| eveningBrakeWordsTextEncrypted | string \| null | 反論の言葉 |
| eveningInsightTextEncrypted | string \| null | 「今日の気づき・感動・学びと課題」 |
| eveningImprovementTextEncrypted | string \| null | 「明日への改善点」 |
| eveningAiSuggestionTextEncrypted | string \| null | Vertex 生成の「Aiコーチからのコメント」（ユーザーが保存したテキストのみ永続化） |
| eveningAiSuggestionRunCount | number \| null | 上記コメントの生成実行回数（同日 UI 上限と併用。平文数値で保存） |
| eveningMessageToSelfTextEncrypted | string \| null | 「今日の自分へのねぎらいの一言」 |
| eveningTomorrowActionSeedTextEncrypted | string \| null | 「今日の振り返りを踏まえた あすの行動内容（目標）」→ 翌日の朝入力にコピー（未入力時のみ） |
| eveningTomorrowGoalTextEncrypted | string \| null | 明日の目標 |
| eveningTomorrowActionContentTextEncrypted | string \| null | 明日の行動内容 |
| eveningTomorrowImagingDone | bool \| null | 明日の行動のイメージング |
| createdAt, updatedAt | Timestamp | 監査用 |

### 2.x-2 users / {uid} / journal_weekly / {weekStartKey}（マネジメント日誌: 週次）

- **パス**: `users/{uid}/journal_weekly/{weekStartKey}`（`weekStartKey` = 当該週の開始日 `YYYY-MM-DD`、`tz = Asia/Tokyo`、ユーザの週開始曜日設定に従う）
- **目的**: 週報（SCREEN-006）の長文。CRUD: `getJournalWeeklyPlain` / `saveJournalWeeklyPlain`（`src/lib/firestore.ts`）。
- **暗号化**: 下記の自由記述は **`encrypt(plaintext, uid)`** で保存（日次と同様）。
- **人コーチ・AI**: 共有メタ・コメントは後続。正本は [03_JOURNAL_COACH_AI_PLANS_AND_CAPABILITIES.md](./03_JOURNAL_COACH_AI_PLANS_AND_CAPABILITIES.md)。現行ルールは本人 read/write のみ。

| フィールド（Firestore・暗号化キー） | 型（想定） | `JournalWeeklyPlain`（復号後・コード上の名前） | 週タブ UI（参考） |
|--------------------------------------|------------|---------------------------------------------------|-------------------|
| weekStartKey | string | `weekStartKey` | ドキュメント ID と一致 |
| tz | string | `tz` | 固定 `Asia/Tokyo` |
| thisWeekActionGoalTextEncrypted | string \| null | `thisWeekActionGoalText` | 今週の行動 → 行動目標（1文） |
| thisWeekActionContentTextEncrypted | string \| null | `thisWeekActionContentText` | 今週の行動 → 行動内容 |
| weeklyActionReviewTextEncrypted | string \| null | `weeklyActionReviewText` | 今週の振り返り → 行動面 → 行動の振り返り |
| weeklyOutcomeReviewTextEncrypted | string \| null | `weeklyOutcomeReviewText` | 成果面 → 成果への振り返り |
| weeklyMetricAchievementTextEncrypted | string \| null | `weeklyMetricAchievementText` | 成果面 → 指標の達成度 |
| weeklyPsychologyTextEncrypted | string \| null | `weeklyPsychologyText` | 心理面（行動時の思考・感情の変化） |
| insightAndLearningTextEncrypted | string \| null | `insightAndLearningText` | 気づき・学び・成長 |
| weeklyIssueRootCauseTextEncrypted | string \| null | `weeklyIssueRootCauseText` | 課題と原因の深掘り |
| nextWeekImprovementTextEncrypted | string \| null | `nextWeekImprovementText` | 来週への改善点 |
| aiImprovementSuggestionTextEncrypted | string \| null | `aiImprovementSuggestionText` | 来週への改善点ブロック内 → Ai改善提案 |
| nextWeekGoalTextEncrypted | string \| null | `nextWeekGoalText` | 来週の行動 → 目標（一文） |
| nextWeekActionContentTextEncrypted | string \| null | `nextWeekActionContentText` | 来週の行動 → 行動内容 |
| weeklySelfPraiseTextEncrypted | string \| null | `weeklySelfPraiseText` | 今週の自分へのねぎらいの言葉 |
| weeklyAiReportRunCount | number \| null | `weeklyAiReportRunCount` | 週次 Ai レポート作成の当日**成功**実行回数（平文・失敗は含めない） |
| weeklyAiReportRunDateKey | string \| null | `weeklyAiReportRunDateKey` | 上記回数の集計日 JST `YYYY-MM-DD`（平文） |
| weeklyAiImprovementRunCount | number \| null | `weeklyAiImprovementRunCount` | 週次 Ai 改善提案の当日**成功**実行回数（平文・失敗は含めない） |
| weeklyAiImprovementRunDateKey | string \| null | `weeklyAiImprovementRunDateKey` | 上記回数の集計日 JST `YYYY-MM-DD`（平文） |
| createdAt, updatedAt | Timestamp | — | 監査用 |

**互換（旧 UI）フィールド**（読み出しのみ想定）: `actionContentAndOutcomeTextEncrypted` / `improvementSummaryTextEncrypted` / `nextWeekActionGoalTextEncrypted` / `emotionAndThoughtTextEncrypted` — 型は `JournalWeeklyEncrypted` を参照（`src/lib/firestore.ts`）。

#### 2.x-2-1 週次 Ai 改善提案 API の入力対照（`POST /api/ai/weekly-improvement`）

クライアントは参照8項目を `【ラベル】` ＋改行＋本文の固定順で連結した `weeklyImprovementInputText` を送る。**各項目の本文は Unicode で 10 文字以上**であることをサーバでも検証する（実装の正本: `src/lib/weeklyImprovementAi.ts` の `WEEKLY_IMPROVEMENT_INPUT_SECTIONS`）。

**応答 JSON**（`POST /api/ai/weekly-improvement`）: `suggestion`（プレーンテキスト1本・見出し＋改行＋本文。トークン注記は含めない）、`charCount`、`usageTotalTokenCount`（任意）。UI は `suggestion` と `usageTotalTokenCount` を結合し、プレビュー文末に `（使用トークン合計: N）` を表示する。保存するのは `suggestion` のみ（`aiImprovementSuggestionText`）。

| 連結ブロックのラベル（`【】` 内） | `JournalWeeklyPlain` |
|----------------------------------|------------------------|
| 行動目標 | `thisWeekActionGoalText` |
| 行動内容 | `thisWeekActionContentText` |
| 行動の振り返り | `weeklyActionReviewText` |
| 成果の振り返り | `weeklyOutcomeReviewText` |
| 心理面　行動時の思考・感情の変化 | `weeklyPsychologyText` |
| 気づき・学び・成長 | `insightAndLearningText` |
| 課題と原因の深掘り | `weeklyIssueRootCauseText` |
| 来週への改善点 | `nextWeekImprovementText` |

### 2.x-3 users / {uid} / journal_monthly / {monthKey}（マネジメント日誌: 月次）

- **パス**: `users/{uid}/journal_monthly/{monthKey}`（`monthKey = YYYY-MM`、`tz = Asia/Tokyo`）
- **目的**: 月報（SCREEN-007 相当）の長文。28日トライアル後も「学び帳」として継続利用する前提。
- **暗号化**: 下記の自由記述は **`encrypt(plaintext, uid)`** で保存（日次・週次と同様）。
- **人コーチ（パーソナル）共有・コメント**: **A-11 同型**で **月次ドキュメント配下**に `coach_share_rounds` / `coach_comment_versions` を配置する（正本: [03_JOURNAL_COACH_AI_PLANS_AND_CAPABILITIES.md](./03_JOURNAL_COACH_AI_PLANS_AND_CAPABILITIES.md)）。現段階のルールは本人 read/write のみ（コーチ read/write は後続フェーズで解放）。

| フィールド（Firestore） | 型（想定） | 画面ラベル（参考） |
|-------------------------|------------|---------------------|
| monthKey | string | ドキュメント ID と一致（例: `2026-04`） |
| tz | string | 固定 `Asia/Tokyo` |
| thisMonthOutcomeGoalTextEncrypted | string \| null | 今月成果目標 |
| thisMonthActionGoalTextEncrypted | string \| null | 今月行動目標 |
| actionSummaryAndOutcomeProgressTextEncrypted | string \| null | 行動概要と成果達成状況 |
| insightAndLearningTextEncrypted | string \| null | 気づき・感動・学び |
| improvementPointsTextEncrypted | string \| null | 改善点 |
| nextMonthActionGoalTextEncrypted | string \| null | 来月の行動目標 |
| sharedWithCoach | bool \| null | 共有意図（UI/ルール用。`false` のときコーチ read 不可） |
| lastSharedWithCoachAt | Timestamp \| null | クライアントが「送信」を完了した最終日時（任意） |
| lastSharedBodyFingerprint | string \| null | 送信時点の本文指紋（任意） |
| coachUnreadAfterClientShare | bool \| null | コーチ側の新着（任意） |
| clientUnreadLatestCoachReply | bool \| null | クライアント側の新着（任意） |
| createdAt, updatedAt | Timestamp | 監査用 |

#### 2.x-3-1 月次配下のサブコレクション（A-11 同型）

```
users/{uid}/journal_monthly/{monthKey}/coach_share_rounds/{roundId}
  └── coach_comment_versions/{versionId}
```

- `coach_share_rounds` は「クライアントがパーソナルコーチへ質問（送信）した 1 回」を表す（暦月 1 回まで。未送信の繰越なし）。
- `coach_comment_versions` は同一ラウンド内のコーチコメントの版（追記のみ・履歴）。

### 2.1 users / {uid}（ユーザープロファイル）


| フィールド        | 型（想定）              | 説明                                               |
| ------------ | ------------------ | ------------------------------------------------ |
| uid          | string             | Firebase Auth の UID（ドキュメントIDと一致）                 |
| email        | string             | メールアドレス                                          |
| displayName  | string             | 表示名                                              |
| photoURL     | string | undefined | プロフィール画像URL                                      |
| role         | string             | ロール: `user` | `coach` | `senior_coach` | `admin` |
| subscription | map                | サブスクリプション情報（下記）                                  |
| consents     | map                | 利用規約・プライバシーポリシー同意（初回ログイン時に必須。版は日付）            |
| createdAt    | Timestamp          | 作成日時                                             |
| updatedAt    | Timestamp          | 更新日時                                             |
| lastLoginAt  | Timestamp          | 最終ログイン日時                                         |
| trialAffirmationMeta | map（任意） | 28日間トライアル・アファメーション UI 状態。`lastSubmenu`（null または select/create/edit/history）、`lastSelectedAffirmationId`（null または string）。**localStorage は使わない**（[04_AFFIRMATION_DESIGN.md](./04_AFFIRMATION_DESIGN.md) §3.6） |
| weekStartsOn | string（任意） | マネジメント日誌の**週の開始曜日**。`sunday` のときのみ保存推奨。**未設定・削除時は月曜始まり**（`src/lib/journalWeek.ts`）。更新は `updateJournalWeekStartsOn`（`firestore.ts`） |
| activeCoachingAffirmationId | string \| null（任意・A-11） | **現在コーチング実施中**の `affirmations/{affirmationId}`。1 つのみ。`trialAffirmationMeta` の選択 ID とは別に、ビジネス上の正を持つ（[03_A11_COACH_SHARING_SCHEMA_DRAFT.md](./03_A11_COACH_SHARING_SCHEMA_DRAFT.md)） |


**subscription（サブオブジェクト）**


| フィールド     | 説明                                              |
| --------- | ----------------------------------------------- |
| plan      | `free` | `standard` | `premium` 等               |
| status    | `active` | `inactive` | `cancelled` | `expired` |
| startDate | 開始日                                             |
| features  | pdca, aiComments, coachComments 等の boolean      |
| usage     | pdcaEntries, aiComments 等の利用数                   |

**consents（サブオブジェクト）**

| フィールド | 説明 |
|---|---|
| termsVersion | 利用規約の同意バージョン（`YYYY-MM-DD`） |
| privacyVersion | プライバシーポリシーの同意バージョン（`YYYY-MM-DD`） |
| acceptedAt | 同意日時（Timestamp） |


- 実装: `src/lib/firestore.ts` の `createDefaultUserProfile` / `createUserProfile` / `getUserProfile`、型は `src/types/auth.ts` の `UserProfile`。

#### ログイン時のデータの流れ（入出力）

| タイミング | 処理 | データの入り先 |
|------------|------|----------------|
| **初回ログイン** | Firebase Authentication で Google ログイン後、`AuthContext` が `getUserProfile(uid)` を実行 | まだドキュメントが無いため `createDefaultUserProfile(user)` が呼ばれる |
| **createDefaultUserProfile** | `users/{uid}` に 1 ドキュメントを作成 | **Firestore の `users` コレクション**。ドキュメント ID = Firebase Auth の UID。フィールドに `uid`, `email`, `displayName`, `photoURL`, **`role`（初期値 `'user'`）**, `subscription` 等を保存 |
| **2回目以降のログイン** | `getUserProfile(uid)` で既存ドキュメントを取得 | 上記 `users/{uid}` から読み取り。`updateLastLogin(uid)` で `lastLoginAt` を更新 |

- ロールの判定は **`users/{uid}.role`** を参照している。このフィールドを `user` / `coach` / `admin` に設定することで、クライアント・ホスト・管理者の区別ができる。
- 利用規約・プライバシーポリシーの同意は `users/{uid}.consents` を参照する。未同意の場合は `GET /consent?next=...` を表示し、同意後 `updateUserConsents(uid, {termsVersion, privacyVersion})` で保存する（版は `src/lib/consent.ts` で管理）。

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

### 2.10 affirmation_profiles / {profileId}（システム・アファメーションプロファイル）

| 項目 | 内容 |
|------|------|
| **目的** | 穴埋めテンプレートのマスタ。管理者が作成・更新。発行後のアファメーション本文とは切り離す。 |
| **保存形式** | **正本は `sections` / `blocks`（ブロック式）**。[04_AFFIRMATION_DESIGN.md](./04_AFFIRMATION_DESIGN.md) §1.6。発行用 Markdown は実行時に blocks から生成。任意で `markdownTemplate` をキャッシュとして持ってもよいが **マスタにしない**。 |
| **権限** | read: ログインユーザ（プログラムでテンプレ表示）、create/update/delete: 管理者（`admin`）。ルールは実装時に `firestore.rules` に追加。 |
| **備考** | `site_content/home` が単一ドキュメントのため、プロファイルは **ルートコレクション `affirmation_profiles`** とする案を採用（論理的にはサイト共通マスタ）。 |

---

### 2.11 users / {uid} / affirmation_drafts / {profileId}

| フィールド | 型（想定） | 説明 |
|------------|------------|------|
| profileId | string | 使用中のプロファイル ID（ドキュメント ID と一致させてもよい） |
| encryptedSlots | string | スロット入力の JSON を暗号化した文字列 |
| updatedAt | Timestamp | 最終更新 |

- **実装**: `getAffirmationDraft`（戻り値に **`updatedAtMs`** あり・選択タブの下書き行ソート用）/ `saveAffirmationDraft` / **`deleteAffirmationDraft`**（発行成功時に下書き削除。`src/lib/firestore.ts`）。ルール: 本人のみ read/write/delete（`firestore.rules` の `affirmation_drafts`）。
- **詳細仕様**: [04_AFFIRMATION_DESIGN.md](./04_AFFIRMATION_DESIGN.md)

---

### 2.12 users / {uid} / affirmation_profiles / {profileId}（ユーザー定義プロファイル・将来）

- ユーザーが新規作成したプロファイル、またはシステムプロファイルをユーザーが複製・改変したもの。
- スキーマは 2.10 と同等。ルール: 本人のみ read/write。

---

### 2.13 users / {uid} / affirmations / {affirmationId}（案 B：親＝メタ）

**採用形**: 親ドキュメントは **メタのみ**。発行済み本文は **`published` サブコレクション**（[04_AFFIRMATION_DESIGN.md](./04_AFFIRMATION_DESIGN.md) §3.3）。

#### 暗号化データはどこにぶら下がるか（`affirmations` 配下）

`users/{uid}/affirmations/{affirmationId}` の **直下の子**は次の 3 種類です。

| ぶら下がり先 | ドキュメント例 | 暗号化される主なフィールド | 備考 |
|--------------|----------------|----------------------------|------|
| **親ドキュメント** | `affirmations/{affirmationId}` そのもの | **現行**: 本文は持たない。**`title` / `status` / `updatedAt` 等は平文**（一覧・名称重複チェック用）。**任意** `encryptedLastPreviewText` は一覧プレビュー用の案（**A-8 では未使用・後回し**）。 | メタ中心 |
| **サブ `published`** | `.../published/current` | **`encryptedBody`**（発行済み Markdown 本文） | 正の本文 |
| **サブ `history`** | `.../history/{historyId}` | **`encryptedBody`**（当時の本文）、**`encryptedTitle`**（当時の表示名）。**`savedAt`** は Timestamp（平文で可） | 「履歴を残す」時のみ追加 |

つまり **本文・履歴の中身（ユーザーが書いた長文）の暗号化**は、**親ではなく** **`published/*` と `history/*` の各ドキュメントのフィールド**に載ります。

**`affirmations` の外**（参考）: 未発行の穴埋め下書きは同じ `users/{uid}` 直下の **`affirmation_drafts/{profileId}`** に **`encryptedSlots`** として保存（発行済みツリーとは別枝）。

#### 親ドキュメント（メタ）

| フィールド | 型（想定） | 説明 |
|------------|------------|------|
| title | string | 表示名（名称変更時は重複チェック） |
| status | string | 例: `draft` / `published`（実装で統一） |
| profileId | string | 作成時に使用したプロファイル（参照用） |
| encryptedLastPreviewText | string（任意） | 一覧用プレビュー（暗号化。[04_AFFIRMATION_DESIGN.md](./04_AFFIRMATION_DESIGN.md) 5） |
| sharedWithCoach | bool | **コーチへの共有意図**（ルール・UI ゲート。A-11） |
| lastSharedWithCoachAt | Timestamp \| null | クライアントが「コーチへ送信」を完了した最終日時（A-11） |
| lastSharedBodyFingerprint | string \| null | 上記送信時点の本文フィンガープリント（暦月＋変更検知用。A-11） |
| coachUnreadAfterClientShare | bool（任意） | コーチ一覧の更新マーク用（A-11・任意） |
| createdAt, updatedAt | Timestamp | |

#### サブコレクション `published/{docId}`

| フィールド | 説明 |
|------------|------|
| encryptedBody | 発行済み本文（Markdown）暗号化。**平文の文字数上限**は [04_TRIAL_28_IMPLEMENTATION_DECISIONS.md](./04_TRIAL_28_IMPLEMENTATION_DECISIONS.md) §9.7 **#6a**（現決定: 1000 文字）。 |
| publishedAt, updatedAt | 日時 |

- **ドキュメント ID**: 現行の正は **`current`** など固定 1 枚とする想定。
- **発行（クライアント UI からの初回登録）**: `publishAffirmation`（`src/lib/firestore.ts`）が親ドキュメントを新規作成し、続けて `published/current` に `encryptedBody`（`encrypt(markdown, uid)`）を書き込む。
- **一覧・表示・名称・削除（A-7）**: `listUserAffirmations`、`getAffirmationPublishedMarkdown`（復号）、`isAffirmationTitleTaken`、`updateAffirmationTitle`、`deleteAffirmationFully`（親＋`published`＋`history` をバッチ削除）。
- **本文更新（A-8）**: `published/current` を更新する際、**親ドキュメントの `updatedAt` も必ず更新**する（一覧の「最終更新」・ソートは親を参照するため。[04_TRIAL_28_IMPLEMENTATION_DECISIONS.md](./04_TRIAL_28_IMPLEMENTATION_DECISIONS.md) §9.7 #3d）。

#### サブコレクション `history/{historyId}`

| フィールド | 説明 |
|------------|------|
| savedAt | 保存日時 |
| encryptedBody | 保存時点の本文（Markdown、暗号化） |
| encryptedTitle | 保存時点の表示名（親 `title` のコピー、暗号化。A-8 本文保存で「履歴を残す」ときに書き込む） |

**未発行の穴埋め下書き**（スロット値）: 親が無い段階でも **`users/{uid}/affirmation_drafts/{profileId}`** に保存（§2.11）。**発行済み本文の編集中**（未保存）は Firestore ではなく **クライアントメモリ**（[04_AFFIRMATION_DESIGN.md](./04_AFFIRMATION_DESIGN.md) §3.3.1）。

- **削除**: **物理削除**。親ドキュメント削除時に **`published`・`history` 含め再帰削除**（バッチまたは Cloud Function で整合）。
- **ルール（現状・`firestore.rules`）**: 親・`published`・`history` いずれも **本人のみ**（**履歴もコーチ不可**）。コーチによる **発行済み本文** の read と **`coach_share_rounds` / `coach_comment_versions`** の read/write は **A-11** で共有フラグ・`coach_client_assignments` に基づき **別途ルール追加**の想定（現ルールでは不可）。
- **詳細**: [04_AFFIRMATION_DESIGN.md](./04_AFFIRMATION_DESIGN.md)、[03_A11_COACH_SHARING_SCHEMA_DRAFT.md](./03_A11_COACH_SHARING_SCHEMA_DRAFT.md)

#### サブコレクション `coach_share_rounds/{roundId}`（A-11）

クライアントの **「コーチへ送信」1 回につき 1 ドキュメント**。

| フィールド | 説明 |
|------------|------|
| clientSentAt | 送信完了時刻 |
| bodyFingerprintAtSend | 送信時点の本文フィンガープリント |
| calendarMonthKey | 任意。例 `2025-10` |
| status | 任意。例 `awaiting_coach` / `coach_replied` |
| assignedCoachUid | 任意。送信時点の担当コーチ UID |

#### サブコレクション `coach_share_rounds/{roundId}/coach_comment_versions/{versionId}`（A-11）

同一ラウンド内のコーチコメントは **追記のみ**（編集ごとに新 `versionId`）。

| フィールド | 説明 |
|------------|------|
| encryptedBody | コーチコメント（暗号化方針は [04_TRIAL_28_IMPLEMENTATION_DECISIONS.md](./04_TRIAL_28_IMPLEMENTATION_DECISIONS.md) §10） |
| authorCoachUid | 執筆コーチ |
| savedAt | 保存日時 |
| versionIndex | 任意。1,2,3… |

---

### 2.14 coach_client_assignments / {assignmentId}（A-11）

**コーチ 1 : クライアント多** の割当。`users` ドキュメントには埋め込まない。

- **ドキュメント ID（確定）**: `{coachUid}_{clientUid}`（セキュリティルールで `exists` / `get` するため。詳細は [03_A11_COACH_SHARING_SCHEMA_DRAFT.md](./03_A11_COACH_SHARING_SCHEMA_DRAFT.md) §8.5）。

| フィールド | 型（想定） | 説明 |
|------------|------------|------|
| coachUid | string | コーチ UID |
| clientUid | string | クライアント UID |
| status | string | 例: `active` / `ended` |
| assignedAt | Timestamp | 割当開始 |
| endedAt | Timestamp \| null | 割当終了（任意） |
| createdAt, updatedAt | Timestamp | 監査用 |

**詳細・クエリ例**: [03_A11_COACH_SHARING_SCHEMA_DRAFT.md](./03_A11_COACH_SHARING_SCHEMA_DRAFT.md) §1。

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
| users/{userId}/affirmation_drafts/{profileId} | 本人のみ | 本人のみ |
| users/{userId}/affirmations/{affirmationId}  | 本人のみ | 本人のみ |
| users/{userId}/affirmations/{affirmationId}/published/{docId} | 本人のみ | 本人のみ |
| users/{userId}/affirmations/{affirmationId}/history/{historyId} | **本人のみ**（履歴もコーチ不可。共有時ルールは A-11 以降） | 本人のみ |
| coach_client_assignments/{assignmentId} | **A-11 未実装**（想定: 関係者のみ read、write は管理者 or CF） | **A-11 未実装** |
| users/.../affirmations/.../coach_share_rounds/... | **A-11 未実装**（想定: 本人＋担当コーチ） | **A-11 未実装** |
| users/.../coach_share_rounds/.../coach_comment_versions/... | **A-11 未実装**（想定: 本人 read、コーチが version 追記） | **A-11 未実装** |
| affirmation_profiles/{profileId}    | 認証ユーザ（想定）   | 管理者のみ（ルール未デプロイ時は要追加） |
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
- 詳細は [04_HOME_SCREEN_IMPLEMENTATION.md](./04_HOME_SCREEN_IMPLEMENTATION.md) の「4. 実装前に確認しておく事項」を参照。

---

## 6. 参照ドキュメント


| ドキュメント                                                                    | 内容                                                              |
| ------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [02_SYSTEM_ARCHITECTURE.md](./02_SYSTEM_ARCHITECTURE.md)                        | 6.1 Firestoreコレクション構造（ツリー）                                      |
| [FIRESTORE_SECURITY_RULES_SETUP.md](../FIRESTORE_SECURITY_RULES_SETUP.md) | セキュリティルール全文・保護コレクション一覧                                          |
| [04_HOME_SCREEN_IMPLEMENTATION.md](./04_HOME_SCREEN_IMPLEMENTATION.md)          | ホーム用データの保存先・スキーマ検討                                              |
| [04_AFFIRMATION_DESIGN.md](./04_AFFIRMATION_DESIGN.md)                            | アファメーション UI・Markdown スロット記法・権限 |
| 実装                                                                        | `src/lib/firestore.ts`（型・CRUD）、`src/types/auth.ts`（UserProfile） |


