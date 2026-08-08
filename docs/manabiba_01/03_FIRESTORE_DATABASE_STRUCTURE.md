# Firestore データベース構造（現状）

## 📋 目的

現時点で想定・利用している **Firestore のコレクション構成と主要フィールド** を一覧にしたドキュメントです。実装やホーム用データ追加時の参照用です。

- **コレクション一覧**: [02_SYSTEM_ARCHITECTURE.md](./02_SYSTEM_ARCHITECTURE.md) の「6.1 Firestoreコレクション構造」と、[FIRESTORE_SECURITY_RULES_SETUP.md](../FIRESTORE_SECURITY_RULES_SETUP.md) のルールで定義されているパスをベースに整理。
- **セキュリティルールの詳細**: [FIRESTORE_SECURITY_RULES_SETUP.md](../FIRESTORE_SECURITY_RULES_SETUP.md) を参照。
- **A-11（2026-03-28）**: コーチ共有の **データ構造・フィールド名** を本書に反映（`coach_client_assignments`、`coach_share_rounds`、`coach_comment_versions`、`activeCoachingAffirmationId`、親 `affirmations` の共有メタ）。**気づきノート**は `journal_weekly` / `journal_monthly` の `sharedWithCoach` と **`coachDailySummaryByDate`**（§2.x-2-2）まで反映。ルールは `firestore.rules` を正本。説明は [03_A11_COACH_SHARING_SCHEMA_DRAFT.md](./03_A11_COACH_SHARING_SCHEMA_DRAFT.md)・[03_JOURNAL_COACH_AI_PLANS_AND_CAPABILITIES.md](./03_JOURNAL_COACH_AI_PLANS_AND_CAPABILITIES.md)。
- **メッセージボード（2026-07-06）**: `communication_board_threads` / `messages` を §2.15 に追加。送信・編集は API（Admin SDK）のみ。一覧 read は割当当事者。詳細は [04_COMMUNICATION_SCREEN_IMPLEMENTATION.md](./04_COMMUNICATION_SCREEN_IMPLEMENTATION.md)。

---

## 1. コレクション構成（ツリー）

```
（ルート）
├── coach_client_assignments/          # コーチ↔クライアント割当（A-11 現状案）
│   └── {assignmentId}
├── communication_board_threads/     # メッセージボード（1ペア1スレッド・§2.15）
│   └── {coachUid}_{clientUid}
│       └── messages/
│           └── {messageId}
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
│       ├── journal_daily/             # 気づきノート（学び帳）日次: 朝・晩（旧称: マネジメント日誌）
│       │   └── {dateKey}              # YYYY-MM-DD（JST）
│       ├── journal_weekly/            # 気づきノート（学び帳）週次（週報）
│       │   └── {weekStartKey}         # その週の開始日 YYYY-MM-DD（JST・設定の週始まり）
│       ├── journal_monthly/           # 気づきノート（学び帳）月次（月報）
│       │   └── {monthKey}             # YYYY-MM（JST・暦月）
│       ├── affirmation_drafts/        # アファメーション穴埋め下書き（暗号化スロット）
│       │   └── {profileId}
│       ├── home_content/              # ホーム個人リスト（Standard 以上）
│       │   └── lists                  # latestVideos / latestArticles / referenceLinks
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
└── site_content/                      # サイト共通コンテンツ（ゲスト／フリー向けホーム。管理者が編集）
    └── home                           # ホーム画面用 1 ドキュメント（お気に入り動画・使えるサイト・参考記事・広告等）
```

- **site_content / home**: ゲスト／フリー向けの共通リスト。読み取りは未認証含む全員可、書き込みは管理者（admin）のみ。**Standard 以上（お試し含む）は個人リスト**（`users/{uid}/home_content/lists`）を使い、共通は表示しない。フィールド例は下記「2.9」を参照。

---

## 2. 各コレクション・ドキュメントの主要フィールド

### 2.x users / {uid} / journal_daily / {dateKey}（気づきノート: 日次 朝・晩）

- **パス**: `users/{uid}/journal_daily/{dateKey}`（`dateKey = YYYY-MM-DD`、`tz = Asia/Tokyo`）
- **目的**: 気づきノート（学び帳）の「朝・晩」記録（SCREEN-005）。28日無料トライアル開始時も同一コレクションを利用し、サブスク継続後もそのまま蓄積する。
- **入力表示レベル**: 各フィールドの UI 表示可否（簡易・普通・詳細）は [04_TRIAL_28_IMPLEMENTATION_DECISIONS.md](./04_TRIAL_28_IMPLEMENTATION_DECISIONS.md) **§4.y**（朝・週・月）、**§4.z**（晩・2026-06 改訂）を正とする（本節はフィールド定義のみ）。
- **暗号化**: 自由記述は **`encrypt(plaintext, uid)`** で暗号化して保存し、読み込み時に復号する。

| フィールド | 型（想定） | 説明 |
|------------|------------|------|
| dateKey | string | `YYYY-MM-DD` |
| tz | string | 固定 `Asia/Tokyo` |
| morningAffirmationDeclaration | string \| null | `'done'` のみ実施 ON。**未チェックは `null`**（§4.z）。既存の `'undone'` は読取時に未実施（`null` 相当）として扱う |
| morningTodayActionTextEncrypted | string \| null | 朝「今日の行動」の統合欄（下位の目標・内容欄と併存し得る。実装の正本は `src/lib/firestore.ts` の `Trial4wDaily*`） |
| morningActionGoalTextEncrypted | string \| null | 今日の行動 — 目標（1文） |
| morningActionContentTextEncrypted | string \| null | 今日の行動 — 行動内容 |
| morningImagingDone | bool \| null | 「今日の行動のイメージング」完了（**詳細のみ**表示・§4.z） |
| eveningExecution | string \| null | `'done' \| 'partial' \| 'none'`。UI ラベル（§4.z）: およそできた／まあまあできた／あまりできなかった |
| eveningSpecificActionsTextEncrypted | string \| null | 「どのように行動できましたか？」（**詳細のみ**。`eveningExecution` が done/partial のとき表示） |
| eveningResultTextEncrypted | string \| null | **UI 非表示**（§4.z）。読取時フォールバック用に保持 |
| eveningResultExecutionTextEncrypted | string \| null | 「今日印象に残ったできごとは何でしたか？」（§4.z 項目3） |
| eveningResultGoalProgressTextEncrypted | string \| null | **UI 非表示**（§4.z）。スキーマ上は削除しない |
| eveningSatisfaction | number \| null | 0〜10。「行動の満足度を10点のうちどのくらいでしたか？」 |
| eveningEmotionThoughtTextEncrypted | string \| null | 「その時、どんな気持ちになりましたか？」（§4.z 項目4） |
| eveningReflectionThoughtTextEncrypted | string \| null | **新規**。「その時、どのような考えが思い浮かびましたか？」（§4.z 項目5） |
| eveningBrake | string \| null | **UI 非表示**（§4.z）。スキーマ上は削除しない |
| eveningBrakeRebuttalChoice | string \| null | **UI 非表示**（§4.z） |
| eveningRebuttalTextEncrypted | string \| null | 旧・反論まとめ欄（移行・互換） |
| eveningBrakeWorkedTextEncrypted | string \| null | 「そこから、なにか気づくことはありましたか？」（§4.z 項目6。旧ブレーキ欄の流用） |
| eveningBrakeRebuttedTextEncrypted | string \| null | **UI 非表示**（§4.z） |
| eveningBrakeWordsTextEncrypted | string \| null | **UI 非表示**（§4.z） |
| eveningInsightTextEncrypted | string \| null | 「この出来事から何を学びましたか？」（§4.z 項目7） |
| eveningImprovementTextEncrypted | string \| null | 「今日の学びをどう明日に活かしますか？」（§4.z 項目8。◇気づき内） |
| eveningAiQuestionTextEncrypted | string \| null | **新規**。「Aiコーチに聞きたい事はありますか？」（§4.z 項目9。API の `userQuestion` 候補） |
| eveningAiSuggestionTextEncrypted | string \| null | Vertex 生成の「Aiコーチからのコメント」（§4.z 項目10。ユーザーが保存したテキストのみ永続化） |
| eveningAiSuggestionRunCount | number \| null | 上記コメントの生成実行回数（同日 UI 上限 **3 回**・平文数値） |
| eveningMessageToSelfTextEncrypted | string \| null | 「他に残しておきたいこと」（§4.z 項目11。**詳細のみ**） |
| eveningTomorrowActionSeedTextEncrypted | string \| null | 「明日の行動目標（1文）」（§4.z 項目12）→ 翌日の朝入力にコピー（未入力時のみ） |
| eveningTomorrowGoalTextEncrypted | string \| null | **UI 非表示**（§4.z）。画面の目標は `eveningTomorrowActionSeedText` を正とする |
| eveningTomorrowActionContentTextEncrypted | string \| null | 「明日の行動内容」（§4.z 項目13。**詳細のみ**） |
| eveningTomorrowImagingDone | bool \| null | 「明日の行動のイメージング（実施）」（§4.z 項目14。**詳細のみ**） |
| createdAt, updatedAt | Timestamp | 監査用 |

**晩タブ UI・表示レベルの正本**: [04_TRIAL_28_IMPLEMENTATION_DECISIONS.md](./04_TRIAL_28_IMPLEMENTATION_DECISIONS.md) **§4.z**。上記のうち **UI 非表示**とあるフィールドはスキーマからは削除せず、読取互換のみ維持する。

#### 2.x-1 日次フィールドと AI 入力の対照（§4.z 改訂・プロンプト検討用）

晩 UI 改訂後の Vertex 入力連結の正本は [04_VERTEX_AI_TRIAL_IMPROVEMENT.md](./04_VERTEX_AI_TRIAL_IMPROVEMENT.md) **§11.0**。本表はフィールド ↔ UI 見出し ↔ AI への載せ方の索引。

| §4.z 順 | UI 見出し（晩） | `Trial4wDailyPlain` | `improvement` 入力 | `weekly-report` 日次ブロック |
|--------|----------------|---------------------|:------------------:|:----------------------------:|
| — | （朝）今日の行動目標 | `morningActionGoalText` 等 | `actionReferenceText`（参照） | ● |
| — | （朝）行動内容 | `morningActionContentText` | `actionReferenceText`（参照） | ● |
| 1 | 行動目標に対してどのくらい実施できましたか？ | `eveningExecution` | 含めない | ● |
| 1.a | どのように行動できましたか？ | `eveningSpecificActionsText` | 含めない | ●（値あり時） |
| 2 | 行動の満足度を10点のうちどのくらいでしたか？ | `eveningSatisfaction` | `actionReferenceText`（参照） | ● |
| 3 | 今日印象に残ったできごとは何でしたか？ | `eveningResultExecutionText` | **`reflectionText`** | ● |
| 4 | その時、どんな気持ちになりましたか？ | `eveningEmotionThoughtText` | **`reflectionText`** | ● |
| 5 | その時、どのような考えが思い浮かびましたか？ | `eveningReflectionThoughtText`（新規） | **`reflectionText`** | ● |
| 6 | そこから、なにか気づくことはありましたか？ | `eveningBrakeWorkedText` | **`reflectionText`** | ● |
| 7 | この出来事から何を学びましたか？ | `eveningInsightText` | **`reflectionText`** | ● |
| 8 | 今日の学びをどう明日に活かしますか？ | `eveningImprovementText` | **`reflectionText`** | ● |
| 9 | Aiコーチに聞きたい事はありますか？ | `eveningAiQuestionText`（新規） | `userQuestion`（別パラメータ） | 含めない |
| 12 | 明日の行動目標（1文） | `eveningTomorrowActionSeedText` | 含めない | ●（任意・実装時に判断） |
| 13 | 明日の行動内容 | `eveningTomorrowActionContentText` | 含めない | ●（詳細のみ・値あり時） |

**`actionReferenceText`**: 学び入力の文脈参照。50 文字下限の対象外。正本は [04_VERTEX_AI_TRIAL_IMPROVEMENT.md](./04_VERTEX_AI_TRIAL_IMPROVEMENT.md) §11.0.2a。

**廃止（AI 入力から除外）**: `eveningBrake` 系・`eveningResultText`・`eveningResultGoalProgressText`・反論関連。週次インプットの **【こころのブレーキ】** 節も廃止（§4.z）。

### 2.x-2 users / {uid} / journal_weekly / {weekStartKey}（気づきノート: 週次）

- **パス**: `users/{uid}/journal_weekly/{weekStartKey}`（`weekStartKey` = 当該週の開始日 `YYYY-MM-DD`、`tz = Asia/Tokyo`、ユーザの週開始曜日設定に従う）
- **目的**: 週報（SCREEN-006）の長文。CRUD: `getJournalWeeklyPlain` / `saveJournalWeeklyPlain`（`src/lib/firestore.ts`）。
- **暗号化**: 下記の自由記述は **`encrypt(plaintext, uid)`** で保存（日次と同様）。
- **人コーチ・AI**: `sharedWithCoach` と **`coachDailySummaryByDate`**（コーチ向け日次サマリ・平文）を週次 doc に保持。コーチ read は `firestore.rules` で **割当 active ＋ `sharedWithCoach` ON ＋ `subscription.features.coachComments`**。月次コメント用サブコレクションは後続。正本は [03_JOURNAL_COACH_AI_PLANS_AND_CAPABILITIES.md](./03_JOURNAL_COACH_AI_PLANS_AND_CAPABILITIES.md)、実装決定は [04_TRIAL_28_IMPLEMENTATION_DECISIONS.md](./04_TRIAL_28_IMPLEMENTATION_DECISIONS.md) §5.2.1。

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
| weeklySelfPraiseTextEncrypted | string \| null | `weeklySelfPraiseText` | **他に残しておきたいこと**（詳細のみ。UI 上は「来週の行動」の直前） |
| sharedWithCoach | bool \| null | `sharedWithCoach` | 見出し右上「コーチと共有」。ON で担当コーチが週次本文＋サマリを read 可 |
| coachDailySummaryByDate | map \| null | `coachDailySummaryByDate` | コーチ向け日次サマリ（記号・満足度のみ。`dateKey` → 各記号フィールド）。§2.x-2-2 |
| weeklyAiReportRunCount | number \| null | `weeklyAiReportRunCount` | 週次 Ai レポート作成の当日**成功**実行回数（平文・失敗は含めない） |
| weeklyAiReportRunDateKey | string \| null | `weeklyAiReportRunDateKey` | 上記回数の集計日 JST `YYYY-MM-DD`（平文） |
| weeklyAiImprovementRunCount | number \| null | `weeklyAiImprovementRunCount` | 週次 Ai 改善提案の当日**成功**実行回数（平文・失敗は含めない） |
| weeklyAiImprovementRunDateKey | string \| null | `weeklyAiImprovementRunDateKey` | 上記回数の集計日 JST `YYYY-MM-DD`（平文） |
| createdAt, updatedAt | Timestamp | — | 監査用 |

**互換（旧 UI）フィールド**（読み出しのみ想定）: `actionContentAndOutcomeTextEncrypted` / `improvementSummaryTextEncrypted` / `nextWeekActionGoalTextEncrypted` / `emotionAndThoughtTextEncrypted` — 型は `JournalWeeklyEncrypted` を参照（`src/lib/firestore.ts`）。

#### 2.x-2-0 週次 Ai レポート作成の API 入力（`POST /api/ai/weekly-report`）

- **リクエスト本文**: `{ "weeklyInputText": string }`（クライアントは `buildWeeklyAiReportInputFromDailies` と同等の連結を送る想定。実装: `src/lib/weeklyAiReportInputFromDailies.ts`）。
- **内容**: 当該週の各日（当日 `todayKey` まで）について、`journal_daily`（朝・晩）の項目を `【日付】` 付きブロックで並べる。自由記述が空なら本文上は **`無し`**。列挙型（実行状況等）も未定義時は **`無し`** 表記。
- **§4.z 改訂後**: 晩ブロックは **§4.z の UI 見出し（疑問形）** で連結する（正本: [04_VERTEX_AI_TRIAL_IMPROVEMENT.md](./04_VERTEX_AI_TRIAL_IMPROVEMENT.md) **§11.0.3**）。ブレーキ・反論節は **出力しない**。【明日の行動】を含む。空欄は **`無し`**。
- **検証**: 連結テキスト全体が **`AI_REPORT_INPUT_MIN_TOTAL_CHARS`（150）** Unicode 文字以上（`src/lib/journalAiReportWriteMode.ts`）。不足時は API が 400。
- **反映**: 応答 JSON の 4 キーを `weeklyActionReviewText` / `weeklyOutcomeReviewText` / `weeklyPsychologyText` / `insightAndLearningText` へ書き込む際、`users.{uid}.weeklyAiReportWriteMode`（`append` / `overwrite` / `skip_if_nonempty`）に従う（`applyAiReportWriteMode`）。

Vertex の詳細は [04_VERTEX_AI_TRIAL_IMPROVEMENT.md](./04_VERTEX_AI_TRIAL_IMPROVEMENT.md) §9.2。

#### 2.x-2-1 週次 Ai 改善提案 API の入力対照（`POST /api/ai/weekly-improvement`）

クライアントは参照8項目を `【ラベル】` ＋改行＋本文の固定順で連結した `weeklyImprovementInputText` を送る。**各項目の本文は Unicode で 10 文字以上**であることをサーバでも検証する（実装の正本: `src/lib/weeklyImprovementAi.ts` の `WEEKLY_IMPROVEMENT_INPUT_SECTIONS`）。

**応答 JSON**（`POST /api/ai/weekly-improvement`）: `suggestion`（プレーンテキスト1本・見出し＋改行＋本文。**100〜500 文字**目安。サーバ上限 500。トークン注記は含めない）、`charCount`、`usageTotalTokenCount`（任意）。UI は `suggestion` と `usageTotalTokenCount` を結合し、プレビュー文末に `（使用トークン合計: N）` を表示する。保存するのは `suggestion` のみ（`aiImprovementSuggestionText`）。

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

#### 2.x-2-2 コーチ向け日次サマリ（`coachDailySummaryByDate`）

週次「コーチと共有」ON に連動。`journal_daily` をコーチが read せず、行動記号・満足度だけ共有する（案 B）。

| 項目 | 内容 |
|------|------|
| **フィールド** | `coachDailySummaryByDate.{dateKey}` … 各キーに `morningSym` / `morningCls` / `eveningSym` / `eveningCls` / `eveningSatisfaction`（平文） |
| **同期** | `saveTrial4wDailyPlain` 成功後に `syncCoachDailySummaryForDate`。**共有 ON** 時に `backfillCoachDailySummaryForWeek` で当該週 7 日分を再構築 |
| **記号算出** | `src/lib/journalCoachDailySummary.ts` の `buildCoachDailySummaryEntry`（`trialDailyWeekSymbols.ts` と同一） |
| **コーチ UI** | `TrialWeekly` / `TrialMonthly`（`coachClient` URL）。週: グリッド＋満足度チャート。月: 共有 ON 週のサマリをカレンダーにマージ |
| **ルール** | 週次 doc 全体の read に含まれる（`sharedWithCoach` 等は §2.x-2 冒頭）。`journal_daily` は引き続き本人のみ |

### 2.x-3 users / {uid} / journal_monthly / {monthKey}（気づきノート: 月次）

- **パス**: `users/{uid}/journal_monthly/{monthKey}`（`monthKey = YYYY-MM`、`tz = Asia/Tokyo`）
- **目的**: 月報（SCREEN-007 相当）の長文。28日トライアル後も**気づきノート**として継続利用する前提。
- **暗号化**: 下記の自由記述は **`encrypt(plaintext, uid)`** で保存（日次・週次と同様）。
- **人コーチ（パーソナル）共有・コメント**: **A-11 同型**で **月次ドキュメント配下**に `coach_share_rounds` / `coach_comment_versions` を配置する（正本: [03_JOURNAL_COACH_AI_PLANS_AND_CAPABILITIES.md](./03_JOURNAL_COACH_AI_PLANS_AND_CAPABILITIES.md)）。コーチ read は `sharedWithCoach` ON 等で `firestore.rules` に反映済み。月次カレンダー記号は週次 `coachDailySummaryByDate` 経由（§2.x-2-2）。

| フィールド（Firestore） | 型（想定） | 画面ラベル（参考） |
|-------------------------|------------|---------------------|
| monthKey | string | ドキュメント ID と一致（例: `2026-04`） |
| tz | string | 固定 `Asia/Tokyo` |
| thisMonthActionGoalTextEncrypted | string \| null | 今月の行動 — 行動目標 |
| thisMonthActionContentTextEncrypted | string \| null | 今月の行動 — 行動内容 |
| monthlyActionReviewTextEncrypted | string \| null | 今月の振り返り — 行動の振り返り |
| monthlyOutcomeReviewTextEncrypted | string \| null | 今月の振り返り — 成果の振り返り |
| monthlyMetricAchievementTextEncrypted | string \| null | 指標の達成度 |
| monthlyPsychologyTextEncrypted | string \| null | 心理面 |
| insightAndLearningTextEncrypted | string \| null | 気づき・学び・成長 |
| monthlyIssueRootCauseTextEncrypted | string \| null | 課題と原因の深掘り |
| nextMonthImprovementTextEncrypted | string \| null | 来月への改善点 |
| aiImprovementSuggestionTextEncrypted | string \| null | Ai改善提案 |
| nextMonthGoalTextEncrypted | string \| null | 来月の行動 — 目標（一文） |
| nextMonthActionContentTextEncrypted | string \| null | 来月の行動 — 行動内容 |
| monthlySpecialNotesTextEncrypted | string \| null | 特記事項（その他自由欄） |
| monthlyAiReportRunCount / monthlyAiReportRunDateKey | number / string \| null | 月次 Ai レポート作成の JST 当日成功回数 |
| monthlyAiImprovementRunCount / monthlyAiImprovementRunDateKey | number / string \| null | 月次 Ai 改善提案の JST 当日成功回数 |
| sharedWithCoach | bool \| null | 共有意図（UI/ルール用。`false` のときコーチ read 不可） |
| （移行前のみ）thisMonthOutcomeGoalTextEncrypted 等 | string \| null | 旧 UI の列。読み込み時に新フィールドへフォールバック表示（再保存で新キーへ移行可） |
| lastSharedWithCoachAt | Timestamp \| null | クライアントが「送信」を完了した最終日時（任意） |
| lastSharedBodyFingerprint | string \| null | 送信時点の本文指紋（任意） |
| coachUnreadAfterClientShare | bool \| null | コーチ側の新着（任意） |
| clientUnreadLatestCoachReply | bool \| null | クライアント側の新着（任意） |
| createdAt, updatedAt | Timestamp | 監査用 |

#### 2.x-3-0 月次 Ai レポート・Ai 改善提案の API 入力

**Ai レポート**（`POST /api/ai/monthly-report`）

- **リクエスト本文**: `{ "monthlyInputText": string }`（`buildMonthlyAiReportInputFromWeeklies` と同等。実装: `src/lib/monthlyAiReportInputFromWeeklies.ts`）。
- **対象週**: 暦月（JST `monthKey = YYYY-MM`）の 1 日〜末日のうち、**`weekStartKey` がその暦月に含まれる週**のみ（`listWeekStartKeysInCalendarMonth`。ユーザの `weekStartsOn` に従う）。各週の `journal_weekly` から、行動目標・行動内容・行動／成果／心理・気づき・課題・来週改善・**他に残しておきたいこと**等を見出し付きで連結。空欄は **`無し`**。
- **検証**: 連結全体 **150 文字以上**（週次レポートと同じ `AI_REPORT_INPUT_MIN_TOTAL_CHARS`）。
- **反映**: `monthlyActionReviewText` / `monthlyOutcomeReviewText` / `monthlyPsychologyText` / `insightAndLearningText` へ。モードは **`weeklyAiReportWriteMode`**（週次と同一フィールド名）。

**Ai 改善提案**（`POST /api/ai/monthly-improvement`）

- クライアントは `monthlyImprovementInputText` を送る。定義の正本: `src/lib/monthlyImprovementAi.ts` の `MONTHLY_IMPROVEMENT_INPUT_SECTIONS`（**9 ブロック**・順序固定）。
- **各ブロック本文は原則 Unicode 10 文字以上**。**「特記事項（その他自由欄）」のみ任意**（`minChars: 0` のため API の短欄検証をスキップ）。
- **応答**: 週次改善提案と同型。`suggestion` は **100〜500 文字**目安・上限 500。保存先は `aiImprovementSuggestionText`。
- **カウンタ**: `monthlyAiReportRunCount` / `monthlyAiReportRunDateKey`、`monthlyAiImprovementRunCount` / `monthlyAiImprovementRunDateKey`（JST 同一日・成功時のみ。いずれも 1 日 3 回まで）。

| 連結ブロックのラベル（`【】` 内） | `JournalMonthlyPlain` | 最小文字数（API 検証） |
|----------------------------------|-------------------------|-------------------------|
| 行動目標 | `thisMonthActionGoalText` | 10 |
| 行動内容 | `thisMonthActionContentText` | 10 |
| 行動の振り返り | `monthlyActionReviewText` | 10 |
| 成果の振り返り | `monthlyOutcomeReviewText` | 10 |
| 心理面　行動時の思考・感情の変化 | `monthlyPsychologyText` | 10 |
| 気づき・学び・成長 | `insightAndLearningText` | 10 |
| 課題と原因の深掘り | `monthlyIssueRootCauseText` | 10 |
| 来月への改善点 | `nextMonthImprovementText` | 10 |
| 特記事項（その他自由欄） | `monthlySpecialNotesText` | —（任意。短欄検証はスキップ） |

Vertex の詳細は [04_VERTEX_AI_TRIAL_IMPROVEMENT.md](./04_VERTEX_AI_TRIAL_IMPROVEMENT.md) §10。

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
| consents     | map                | **利用規約（章立て・サービス全体）＋プライバシーポリシー**の同意（会員登録時に1回。7日間・気づきノートとも共通。版は日付） |
| createdAt    | Timestamp          | 作成日時                                             |
| updatedAt    | Timestamp          | 更新日時                                             |
| lastLoginAt  | Timestamp          | 最終ログイン日時                                         |
| trialAffirmationMeta | map（任意） | 28日間トライアル・アファメーション UI 状態。`lastSubmenu`（null または select/create/edit/history）、`lastSelectedAffirmationId`（null または string）。**localStorage は使わない**（[04_AFFIRMATION_DESIGN.md](./04_AFFIRMATION_DESIGN.md) §3.6） |
| weekStartsOn | string（任意） | 気づきノートの**週の開始曜日**。`sunday` のときのみ保存推奨。**未設定・削除時は月曜始まり**（`src/lib/journalWeek.ts`）。更新は `updateJournalWeekStartsOn`（`firestore.ts`） |
| weeklyAiReportWriteMode | string（任意） | **Aiレポート作成**（週・月）で生成結果を既存入力にどう反映するか。`append` \| `overwrite` \| `skip_if_nonempty`（既に文字がある欄は変更しない）。未設定時は UI で `append` 相当。更新は `updateWeeklyAiReportWriteMode`。型は `WeeklyAiReportWriteMode`（`src/types/auth.ts`） |
| activeCoachingAffirmationId | string \| null（任意・A-11） | **現在コーチング実施中**の `affirmations/{affirmationId}`。1 つのみ。`trialAffirmationMeta` の選択 ID とは別に、ビジネス上の正を持つ（[03_A11_COACH_SHARING_SCHEMA_DRAFT.md](./03_A11_COACH_SHARING_SCHEMA_DRAFT.md)） |


**subscription（サブオブジェクト）**

Phase A（決済なし）で型・Firestore と揃える。**正本**は `users/{uid}.subscription`。クライアントからの直接書き換えは行わず、将来は Webhook（Admin SDK）等のみ（[04_SUBSCRIPTION_PRODUCT_SCOPE.md](./04_SUBSCRIPTION_PRODUCT_SCOPE.md) 付録 B）。

| フィールド | 型（想定） | 説明 |
| ---------- | ---------- | ---- |
| plan | string | `free` \| `standard` \| `premium`（[01_ROLES_AND_SUBSCRIPTION_DESIGN.md](./01_ROLES_AND_SUBSCRIPTION_DESIGN.md) §4 と整合） |
| status | string | `active` \| `inactive` \| `cancelled` \| `expired` |
| startDate | Timestamp | 契約・プラン記録の開始 |
| endDate | Timestamp（任意） | レガシーまたは表示用の終了。Stripe 連携時は `currentPeriodEnd` を優先してもよい |
| trialEndsAt | Timestamp（任意） | **気づきノート28日お試し**の終了（**スタンダード／プレミアム初回申込時のみ**。フリー会員には通常未設定） |
| trialConsumedAt | Timestamp（任意） | 28日お試しを**消費した日時**（**再付与なし**判定） |
| dataRetentionEndsAt | Timestamp（任意） | **解約日またはプラン変更日＋90日**のデータ削除予定 |
| courseId | string（任意） | `ai_only` \| `ai_plus_personal` 等（[03_JOURNAL_COACH_AI_PLANS_AND_CAPABILITIES.md](./03_JOURNAL_COACH_AI_PLANS_AND_CAPABILITIES.md)）。`plan` から導出してもよい |
| coaching | map（任意） | プレミアム面談用。例: `firstSessionFreeAvailable`（boolean）、`firstSessionUsedAt`（Timestamp） |
| currentPeriodEnd | Timestamp（任意） | Stripe `current_period_end` のミラー。**解約予約中でも期間内は有効**とみなす判定に使う |
| stripeCustomerId | string（任意） | Stripe Customer ID（`cus_...`）。未連携時は未設定 |
| stripeSubscriptionId | string（任意） | Stripe Subscription ID（`sub_...`）。未連携時は未設定 |
| features | map | 既存: `pdca`, `aiComments`, `coachComments` 等の boolean（[04_IMPLEMENTATION_STEPS_DB_AND_AUTH.md](./04_IMPLEMENTATION_STEPS_DB_AND_AUTH.md) 【4】）。**API ガードの正本は `src/lib/subscription/resolveEntitlements.ts` に寄せていく** |
| usage | map | 既存: 利用数カウンタ |

**entitlement（派生物）**: `UserProfile` を入力に `resolveEntitlements` が `Record<FeatureKey, boolean>` を返す（`src/lib/subscription/`）。Firestore に冗長保存するかは任意（[04_SUBSCRIPTION_PRODUCT_SCOPE.md](./04_SUBSCRIPTION_PRODUCT_SCOPE.md) 付録 C.1）。

**将来（addons）**: オプション課金を持つ場合は `subscription.addons`（配列または map）を別途定義する（現時点ではフィールドなしでよい）。

**consents（サブオブジェクト）**

フリー会員・有料プラン共通。**7日間・気づきノート専用の二重同意フィールドは持たない**（A案。利用規約本文は章立てで読み分け）。

| フィールド | 説明 |
|---|---|
| termsVersion | 利用規約の同意バージョン（`YYYY-MM-DD`） |
| privacyVersion | プライバシーポリシーの同意バージョン（`YYYY-MM-DD`） |
| acceptedAt | 同意日時（Timestamp） |

- 未設定時は `GET /consent?next=...` を表示し、同意後 `updateUserConsents(uid, {termsVersion, privacyVersion})` で保存する。版の正本は `public/legal/terms.json` / `privacy.json` の `version`（索引: [04_LEGAL_DOCUMENTS.md](./04_LEGAL_DOCUMENTS.md)）。
- 実装: `src/lib/firestore.ts` の `createDefaultUserProfile` / `createUserProfile` / `getUserProfile`、型は `src/types/auth.ts` の `UserProfile`。

#### ログイン時のデータの流れ（入出力）

| タイミング | 処理 | データの入り先 |
|------------|------|----------------|
| **初回ログイン** | Firebase Authentication で Google ログイン後、`AuthContext` が `getUserProfile(uid)` を実行 | まだドキュメントが無いため `createDefaultUserProfile(user)` が呼ばれる |
| **createDefaultUserProfile** | `users/{uid}` に 1 ドキュメントを作成 | **Firestore の `users` コレクション**。ドキュメント ID = Firebase Auth の UID。フィールドに `uid`, `email`, `displayName`, `photoURL`, **`role`（初期値 `'user'`）**, `subscription` 等を保存 |
| **2回目以降のログイン** | `getUserProfile(uid)` で既存ドキュメントを取得 | 上記 `users/{uid}` から読み取り。`updateLastLogin(uid)` で `lastLoginAt` を更新 |

- ロールの判定は **`users/{uid}.role`** を参照している。このフィールドを `user` / `coach` / `admin` に設定することで、クライアント・ホスト・管理者の区別ができる。
- 利用規約・プライバシーポリシーの同意は `users/{uid}.consents` のみを参照する（7日間・気づきノート共通）。未同意の場合は `GET /consent?next=...` を表示し、同意後 `updateUserConsents` で保存する（[04_HOME_SCREEN_IMPLEMENTATION.md](./04_HOME_SCREEN_IMPLEMENTATION.md) §1.3）。

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

### 2.9 site_content / home（ホーム画面・ゲスト／フリー向け共通）

ホームの動画・記事・サイト・広告などを保存するための **1 ドキュメント**。管理者のみ書き込み可、表示用の読み取りは未認証含む全員可。**表示対象はゲスト／フリー**（および管理者モードでの編集プレビュー）。Ai／プレミアムは §2.9.1 の個人ドキュメントを使う。

| フィールド | 型（想定） | 説明 |
|------------|------------|------|
| **latestVideos** | 配列 | お気に入り動画一覧（表示名）。各要素: `{ url, title, thumbnailUrl, order, author_name?, author_url? }` |
| **referenceLinks** | 配列 | 使えるサイト一覧。各要素: `{ url, title?, siteName, thumbnailUrl, order }` |
| **latestArticles** | 配列 | 参考にしたい記事一覧。各要素: `{ url, title, lead, source, thumbnailUrl, order }` |
| **ad** | map または string | 広告エリアの内容（項目は後で定義） |
| **updatedAt** | Timestamp | 最終更新日時（管理者が保存したとき） |

- セキュリティルール: `site_content/home` 用の read（全員可）・write（isAdminUser()）。
- **実装**: `getHomeContent()`・`updateHomeLatestVideos()` 等。各配列は保存時に最大 **25** 件に切り詰め。

### 2.9.1 users / {uid} / home_content / lists（ホーム個人リスト）

| 項目 | 内容 |
|------|------|
| **パス** | `users/{uid}/home_content/lists` |
| **対象** | Aiコース／プレミアム（`plan=standard|premium` の有効期間、または free のお試し中）。判定は UI 側 `shouldUseHomePersonalLists`、write ルールは `journalWriteAllowedForOwner` と同条件 |
| **フィールド** | `latestVideos` / `latestArticles` / `referenceLinks` / `updatedAt`（§2.9 と同スキーマ。各最大 25 件） |
| **権限** | read/write: 本人のみ（write は上記サブスク条件あり） |
| **実装** | `getUserHomeContent` / `updateUserHomeLatestVideos` / `updateUserHomeLatestArticles` / `updateUserHomeReferenceLinks` |
| **移行** | 既存の `site_content/home` はゲスト／フリー用に残す。個人への自動コピーはしない（初期空） |

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
| encryptedBody | 発行済み本文（Markdown）暗号化。**平文の文字数上限**は [04_TRIAL_28_IMPLEMENTATION_DECISIONS.md](./04_TRIAL_28_IMPLEMENTATION_DECISIONS.md) §9.7 **#6a**（穴上限合計＋固定文言。正本: `AFFIRMATION_MARKDOWN_BODY_MAX_LENGTH`）。 |
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

### 2.15 communication_board_threads / {threadId} / messages / {messageId}（メッセージボード）

**コーチ↔クライアント Q&A**（プレミアム・クライアント側）。1ペア1タイムライン（パターンB）。実装仕様は [04_COMMUNICATION_SCREEN_IMPLEMENTATION.md](./04_COMMUNICATION_SCREEN_IMPLEMENTATION.md)。

- **ドキュメント ID**: `threadId` = `{coachUid}_{clientUid}`（`coach_client_assignments` と同一）
- **書き込み**: **Next.js API のみ**（Admin SDK）。クライアント SDK からの create/update はルールで拒否
- **読み取り**: 割当 `active` のコーチまたはクライアント。画面は `tab=board` 表示中のみ `onSnapshot`（`src/lib/communicationBoard.ts`）

**スレッド親 `communication_board_threads/{threadId}`**

| フィールド | 型（想定） | 説明 |
|------------|------------|------|
| coachUid | string | コーチ UID |
| clientUid | string | クライアント UID |
| createdAt | Timestamp | 初回メッセージ時 |
| updatedAt | Timestamp | 最終メッセージ時 |
| lastMessageAt | Timestamp \| null | 最新メッセージ時刻（未読判定） |
| lastMessageAuthorUid | string \| null | 最新メッセージ送信者 |
| lastMessageId | string \| null | 最新メッセージ ID（任意） |
| coachLastReadAt | Timestamp \| null | コーチの既読時刻（最下部到達時） |
| clientLastReadAt | Timestamp \| null | クライアントの既読時刻（最下部到達時） |

**メッセージ `…/messages/{messageId}`**

| フィールド | 型（想定） | 説明 |
|------------|------------|------|
| authorUid | string | 送信者 UID |
| body | string | 本文 |
| createdAt | Timestamp | 作成 |
| edited | boolean | 編集済み |
| editedAt | Timestamp \| null | 最終編集（任意） |
| readAt | Timestamp \| null | 相手が最下部到達したときの既読時刻 |

**未読判定（案C）**: 相手が最新投稿者かつ `lastMessageAt > (自分の LastReadAt)`（未設定は未読）。実装: `src/lib/communicationBoardUnread.ts`。

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
| users/{userId}                      | 本人／担当コーチ（クライアント配下 read）／割当クライアント（コーチ表示名 read） | 本人のみ  |
| users/{userId}/smart-goals/{goalId} | 本人のみ          | 本人のみ  |
| users/{userId}/affirmation_drafts/{profileId} | 本人のみ | 本人のみ |
| users/{userId}/home_content/{docId} | 本人のみ | 本人のみ（サブスク条件あり・journal と同型） |
| users/{userId}/affirmations/{affirmationId}  | 本人のみ | 本人のみ |
| users/{userId}/affirmations/{affirmationId}/published/{docId} | 本人のみ | 本人のみ |
| users/{userId}/affirmations/{affirmationId}/history/{historyId} | **本人のみ**（履歴もコーチ不可。共有時ルールは A-11 以降） | 本人のみ |
| users/{userId}/journal_daily/{dateKey} | **本人のみ**（コーチは `coachDailySummaryByDate` 経由のみ） | 本人のみ（サブスク条件あり） |
| users/{userId}/journal_weekly/{weekStartKey} | 本人／担当コーチ（`sharedWithCoach` ON 等） | 本人のみ |
| users/{userId}/journal_monthly/{monthKey} | 本人／担当コーチ（`sharedWithCoach` ON 等） | 本人のみ |
| coach_client_assignments/{assignmentId} | 関係者（コーチ・クライアント・管理者） | 管理者 |
| communication_board_threads/{threadId} | 割当当事者（コーチ・クライアント） | **API のみ**（ルールでクライアント write 不可） |
| communication_board_threads/…/messages/{messageId} | 同上 | **API のみ** |
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


