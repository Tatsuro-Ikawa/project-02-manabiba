# Vertex AI — トライアル学び帳の AI 機能（開発者向け）

## 1. 概要

4週間トライアル（`/trial_4w`）で **Vertex AI（Gemini）** を使う実装のまとめです。

| 画面 | 機能 | API |
|------|------|-----|
| **朝・晩** | Aiコーチからのコメント | `POST /api/ai/improvement` |
| **週** | Aiレポート作成（4項目 JSON） | `POST /api/ai/weekly-report` |
| **週** | Ai改善提案（詳細モードのみ・プレーンテキスト） | `POST /api/ai/weekly-improvement` |
| **月** | Aiレポート作成（4項目 JSON） | `POST /api/ai/monthly-report` |
| **月** | Ai改善提案（詳細モードのみ・プレーンテキスト） | `POST /api/ai/monthly-improvement` |

**朝・晩タブ**では、当日の振り返り入力（複数欄を連結したテキスト）をもとにコーチング風のコメントを生成する PoC です。画面上の表記は **「Aiコーチからのコメント」** です。

- **画面・クライアント**: `src/components/trial/TrialMorningEvening.tsx`  
  - 入力は `buildEveningReflectionText`（`src/lib/eveningAiImprovementInput.ts`）で晩の項目3〜8（a〜f）を UI 見出し付きで連結し、`reflectionText` に載せる。項目9は `userQuestion`（任意）。  
  - **`reflectionText` 50 文字以上**のときのみ実行可（項目 g は含めない）。  
  - **同一日あたり 3 回**まで実行（`eveningAiSuggestionRunCount`）。UI に回数表示は出さない。  
  - 生成結果は任意で **「Aiコーチからのコメントを保存」** により `eveningAiSuggestionText` に永続化。  
  - `POST /api/ai/improvement` を `fetch` で呼び出す（相対パス）。
- **API ルート**: `src/app/api/ai/improvement/route.ts`  
  - `runtime = 'nodejs'`  
  - **Vertex AI REST** の `generateContent` を `google-auth-library` のアクセストークンで呼び出す。  
  - 本文は **400〜500 文字**を目安。サーバ側上限 **`MAX_SUGGESTION_CHARS = 500`**。350 文字未満のときは **最大 1 回**拡張プロンプトで再呼び出し。  
  - 応答末尾に **`（使用トークン合計: N）`** をサーバー側で付与。  
  - `generationConfig.maxOutputTokens` は **4000**。

プロダクト上の役割分担の正本は [03_JOURNAL_COACH_AI_PLANS_AND_CAPABILITIES.md](./03_JOURNAL_COACH_AI_PLANS_AND_CAPABILITIES.md) を参照してください。  
**プロンプト全文の正本（写し）**は本書 **§11**。コード変更時は `src/app/api/ai/*/route.ts` を先に更新し、§11 を同期すること。

### 1.1 開発用コンソールログ

検証用に `prompt` / 応答本文 / `aiJson` を `console.info` するコードがあるが、**現在は `ENABLE_AI_PROMPT_LOG = false` で無効**。再有効化する場合は `src/app/api/ai/improvement/route.ts` 内の定数を編集する（個人情報がログに出るため本番ではオフ推奨）。

---

## 2. 環境変数（`.env.local`）

**リポジトリにコミットしないこと。** 鍵 JSON は `.gitignore` 対象外のパスに置かない運用を推奨します。

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `GOOGLE_CLOUD_PROJECT` | はい | GCP プロジェクト ID（例: `plandosee-project-01`） |
| `GCP_SA_KEY_JSON` | 推奨（Vercel） | サービスアカウント鍵 JSON の**全文文字列**。設定時はこれを優先して認証する |
| `GOOGLE_APPLICATION_CREDENTIALS` | ローカルで推奨 | **サービスアカウント鍵の JSON ファイル**への絶対パス。**ディレクトリやプロジェクトルートは不可**。Vertex AI に加え **Firebase Admin（Bearer 検証）** でも利用可（`src/lib/firebaseAdmin.ts`） |
| `GOOGLE_CLOUD_LOCATION` | いいえ | 既定: `asia-northeast1`。モデルリソース名の `locations/...` に使う |
| `VERTEX_AI_GEMINI_MODEL` | いいえ | 既定: `gemini-2.5-flash`（コード側フォールバックと一致） |
| `MANABIBA_DISABLE_AI_ENTITLEMENT_CHECK` | ローカルのみ | `true` でプラン entitlement チェックをスキップ（Bearer 認証は維持）。**本番では設定しない** |

認証の優先順位は **`GCP_SA_KEY_JSON` → `GOOGLE_APPLICATION_CREDENTIALS`**（Vertex AI の `google-auth-library`）。  
Firebase Admin（`/api/ai/*` の Bearer 検証）は **`FIREBASE_SERVICE_ACCOUNT_JSON` → `GCP_SA_KEY_JSON` → `GOOGLE_APPLICATION_CREDENTIALS`**。  
entitlement チェック（Firestore の `users/{uid}` 読み取り）を有効にする場合、サービスアカウントに **Cloud Datastore User**（または Firebase Admin 相当）が必要。Vertex AI 専用 SA だけでは `PERMISSION_DENIED` になる。ローカルでは `MANABIBA_DISABLE_AI_ENTITLEMENT_CHECK=true` で Phase B 以前と同様にスキップできる。  
`.env.local` を変更したら **Next の dev サーバーを再起動**してください。

### 2.1 Vercel の Branch / Environment 運用ルール

このプロジェクトでは、Vercel の本番運用を次の前提で整理する。

- **Production Branch**: `main`
- `main` への push は **Production Deployment**（本番 URL）
- `main` 以外（例: `feature/*`）への push は **Preview Deployment**（検証 URL）

> Environment（`Production` / `Preview` / `Development`）は「実行環境の種類」、  
> Branch は「どの Environment にデプロイされるか」を決めるトリガー。

### 2.2 Vercel 環境変数の推奨配置（本プロジェクト）

| 変数名 | Production | Preview | Development |
|--------|------------|---------|-------------|
| `GOOGLE_CLOUD_PROJECT` | 必須 | AI を検証するなら設定 | 任意 |
| `GCP_SA_KEY_JSON` | 必須（推奨） | AI を検証するなら設定 | 任意 |
| `GOOGLE_CLOUD_LOCATION` | 任意 | 任意 | 任意 |
| `VERTEX_AI_GEMINI_MODEL` | 任意 | 任意 | 任意 |

- **本番で AI を動かす最小要件**: `Production` に `GOOGLE_CLOUD_PROJECT` と `GCP_SA_KEY_JSON`
- **ローカル開発中心**なら `Development` は未設定でもよい（`.env.local` を利用）
- `GOOGLE_APPLICATION_CREDENTIALS` はローカル向け。Vercel では通常 `GCP_SA_KEY_JSON` を使う

### 2.3 Vercel 設定手順（UI）

1. Vercel の対象プロジェクトを開く
2. **Settings → Git** で `Production Branch = main` を確認
3. **Settings → Environment Variables** で `Production` に以下を登録
   - `GOOGLE_CLOUD_PROJECT`
   - `GCP_SA_KEY_JSON`（サービスアカウント鍵 JSON 全文）
4. 必要なら `Preview` にも同じ値を登録（検証環境でも AI を使う場合）
5. 保存後、`main` の最新デプロイを **Redeploy**

### 2.4 反映確認チェックリスト（ADC エラー回避）

`Could not load the default credentials` が出る場合、次を上から順に確認する。

1. 変数名が **`GCP_SA_KEY_JSON`** と完全一致している
2. `Environment = Production` に設定されている
3. Branch Filter が `main`（または未指定）になっている
4. 変数保存後に本番デプロイを Redeploy 済み
5. デプロイ対象コミットが `GCP_SA_KEY_JSON` 対応コードを含んでいる

---

## 3. GCP 側の準備

### 3.1 API の有効化

1. [Google Cloud Console](https://console.cloud.google.com/) で対象プロジェクトを選択  
2. **API とサービス → ライブラリ**  
3. **Vertex AI API** を検索して有効化  

（一覧確認は **有効な API とサービス** から。）

### 3.2 サービスアカウントと IAM

1. **IAM と管理 → サービス アカウント** で、アプリ用の SA を作成（または既存を使用）  
2. 鍵の JSON をダウンロードし、`GOOGLE_APPLICATION_CREDENTIALS` がその**ファイル**を指すようにする  
3. **IAM と管理 → IAM** で、その SA（`client_email` と一致）に次を付与  
   - **`Vertex AI ユーザー`**（`roles/aiplatform.user`）  

**注意**: **`Vertex AI サービス エージェント`**（`roles/aiplatform.serviceAgent`）は Google 管理用の役割であり、アプリ用 SA の呼び出し権限の代替にはなりません。

### 3.3 鍵と `client_email` の一致

JSON 内の `"client_email"` が、IAM でロールを付けた SA と**同じ**であることを確認してください。別 SA の鍵のままだと 403 になります。

---

## 4. 呼び出し仕様（実装メモ）

### 4.1 エンドポイント URL

[公式 REST](https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/projects.locations.publishers.models/generateContent) に従い、次の形です。

- **ベース**: `https://aiplatform.googleapis.com`（**リージョンホスト** `https://{region}-aiplatform.googleapis.com` ではない）  
- **パス**: `/v1/projects/{PROJECT}/locations/{LOCATION}/publishers/google/models/{MODEL_ID}:generateContent`

`{LOCATION}` は東京利用時も `asia-northeast1` でよいケースが多いです（モデル ID がそのリージョンで提供されていることが前提）。

### 4.2 認証

`GoogleAuth` で `https://www.googleapis.com/auth/cloud-platform` スコープを取得し、`Authorization: Bearer {token}` で上記 URL に POST します。

### 4.3 モデル ID と退役

[モデルバージョンとライフサイクル](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions)に従い、**退役済みモデルは 404** になります。  
例: `gemini-1.5-flash-001` / `gemini-1.5-flash-002` は退役済みのため利用しないでください。

既定は **`gemini-2.5-flash`**（現行の安定系のひとつ）です。コスト・速度優先なら `gemini-2.5-flash-lite` や `gemini-2.0-flash-lite-001` などへの差し替えを `.env.local` で行えます。

---

## 5. API `POST /api/ai/improvement`

### 5.1 リクエスト

- **Content-Type**: `application/json`  
- **Body**:

```json
{
  "reflectionText": "晩の気づき欄（項目3〜8／a〜f）を UI 見出しで連結。合計50文字以上",
  "userQuestion": "Aiコーチに聞きたい事（任意）"
}
```

- **`reflectionText`**: 必須。Unicode **50 文字以上**（項目 g は含めない）。  
- **`userQuestion`**: 任意。  
- **後方互換**: `actionResultText` のみのリクエストは `reflectionText` 相当として受理（50 文字検証あり）。

クライアントは `buildEveningReflectionText`（`src/lib/eveningAiImprovementInput.ts`）で連結する。

### 5.2 成功レスポンス

```json
{
  "suggestion": "見出し+本文（400〜500文字目安）。末尾に改行で（使用トークン合計: N）が付く場合あり",
  "charCount": 0,
  "usageTotalTokenCount": 0
}
```

- `suggestion` … 本文の後に、取得できた場合のみ `（使用トークン合計: N）` が続く（`N` は当該 API 呼び出し内の Vertex `usageMetadata.totalTokenCount` の合算）。  
- `charCount` … `suggestion` 全体の Unicode コードポイント数。  
- `usageTotalTokenCount` … 上記 `N` と同値。取得できない場合はフィールド省略可。

### 5.3 エラー時（例）

- **400**: 本文欠如、`reflectionText` 50文字未満、JSON 不正  
- **422**: ポリシーによるブロック（`promptFeedback.blockReason` あり）  
- **500**: `GOOGLE_CLOUD_PROJECT` 未設定、鍵ファイル不正・未検出（メッセージにパスが含まれる場合あり）  
- **502**: Vertex からのエラー本文、空の candidates、**本文が最小文字数未満**、想定外例外（開発時は `Error.message` を返すことがある）  
- **504**: タイムアウト（`AbortSignal` 約 20 秒）

クライアントは `res.json()` の `error` を表示します。

### 5.4 補足: `finishReason: "MAX_TOKENS"` と `usageMetadata`

Vertex 応答の `candidates[0].finishReason` が **`MAX_TOKENS`** のときは、**出力トークン上限に達して生成が打ち切られた**ことを意味する。`usageMetadata.thoughtsTokenCount`（内部推論）が大きいと、本文 `candidatesTokenCount` が短くなることがある。対策として `maxOutputTokens` を上げたり、プロンプトを短くしたり、短文時の再生成ロジックを併用する。

---

## 6. トラブルシューティング

| 現象 | 想定原因 | 対処の方向 |
|------|----------|------------|
| `GOOGLE_APPLICATION_CREDENTIALS` がフォルダを指している／「not a file」 | パスが JSON ファイルではない | `.json` ファイルのフルパスに修正 |
| `ENOENT` | 鍵パスが存在しない | パス・ドライブ文字・ファイル名を確認 |
| **403** `aiplatform.endpoints.predict` denied | SA に Vertex 呼び出し権限がない | **`Vertex AI ユーザー`** を該当 SA に付与。Vertex AI API 有効化を確認 |
| **404** Publisher Model not found | 退役モデル／未提供リージョン／誤ったモデル ID | [モデル一覧](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions)で現行 ID に変更。`VERTEX_AI_GEMINI_MODEL` を更新 |
| 502（汎用メッセージ） | 例外の詳細が隠れている | サーバーログの `ai/improvement` を確認。クライアントの `error` 全文を確認 |
| 本文が極端に短い／途中で切れる | `finishReason: MAX_TOKENS` や `thoughtsTokenCount` の消費 | §5.4 を参照。`maxOutputTokens`・再生成ロジックは `route.ts` を確認 |
| 504 | ネットワーク遅延・Vertex 側の遅延 | 再実行、タイムアウト延長（コード変更が必要） |

LAN（例: `http://192.168.11.10:3000`）からブラウザで開いていても、**Vertex への通信は Next を動かしているマシンから**行われます。鍵とネットワークはそのマシン基準で成立させてください。

---

## 7. 本番・セキュリティ

- **鍵 JSON をリポジトリに含めない**  
- Vercel 等では **環境変数に鍵内容を入れる方式**や **Workload Identity** など、ホスティングの推奨パターンに合わせる（本ドキュメントは主にローカル PoC 向け）  
- 本 API は **認証済み Firebase ユーザー限定にしていない**（サーバールートのみ）。本番投入前に **レート制限・認可・ログ方針** を別途決めることを推奨します。

---

## 8. 関連ファイル一覧（抜粋）

| 種別 | パス |
|------|------|
| API（朝・晩） | `src/app/api/ai/improvement/route.ts` |
| 晩 AI 入力連結・プロンプト | `src/lib/eveningAiImprovementInput.ts` |
| UI（朝・晩） | `src/components/trial/TrialMorningEvening.tsx` |
| API（週・レポート／改善） | `src/app/api/ai/weekly-report/route.ts`、`src/app/api/ai/weekly-improvement/route.ts` |
| API（月・レポート／改善） | `src/app/api/ai/monthly-report/route.ts`、`src/app/api/ai/monthly-improvement/route.ts` |
| UI（週） | `src/components/trial/TrialWeekly.tsx` |
| UI（月） | `src/components/trial/TrialMonthly.tsx` |
| レポート用インプット生成 | `src/lib/weeklyAiReportInputFromDailies.ts`、`src/lib/monthlyAiReportInputFromWeeklies.ts`、`src/lib/journalWeek.ts`（`listWeekStartKeysInCalendarMonth`） |
| レポート反映モード | `src/lib/journalAiReportWriteMode.ts`（`AI_REPORT_INPUT_MIN_TOTAL_CHARS`、`applyAiReportWriteMode`） |
| スタイル（ボタン状態など） | `src/styles/home-trial.css` |
| 依存 | `package.json` の `google-auth-library` |

設計書索引: [00_README.md](./00_README.md)

---

## 9. 週タブ: `POST /api/ai/weekly-report` と `POST /api/ai/weekly-improvement`

### 9.1 共通（週次）

- **認証・モデル・REST URL**は §4 と同様（`GOOGLE_CLOUD_PROJECT` / `GCP_SA_KEY_JSON` / `VERTEX_AI_GEMINI_MODEL`）。
- **週次の実行回数**は `journal_weekly` に**機能別**に保持し、**JST の同一日（`YYYY-MM-DD`）における成功回数のみ**加算する（失敗・422・502 はカウントしない）。
  - **Aiレポート作成**: `weeklyAiReportRunCount` / `weeklyAiReportRunDateKey`
  - **Ai改善提案**: `weeklyAiImprovementRunCount` / `weeklyAiImprovementRunDateKey`
- **上限**: いずれも **1 日あたり 3 回まで**（`TrialWeekly.tsx` の `WEEKLY_AI_DAILY_LIMIT`。朝・晩の 3 回とは独立）。
- **Aiレポートの反映モード**（週・月で共通）: `users/{uid}.weeklyAiReportWriteMode` を参照（`append`／`overwrite`／`skip_if_nonempty`＝既存入力がある欄は変更しない）。未設定時は UI では `append` 相当。設定 UI: `/trial_4w/settings`。
- スキーマ・入力対照の正本: [03_FIRESTORE_DATABASE_STRUCTURE.md](./03_FIRESTORE_DATABASE_STRUCTURE.md) §2.x-2（週次）および §2.x-2-0 / §2.x-2-1。

### 9.2 `POST /api/ai/weekly-report`

- **Body**: `{ "weeklyInputText": string }` — クライアントは **`buildWeeklyAiReportInputFromDailies`**（`src/lib/weeklyAiReportInputFromDailies.ts`）と同等の本文を送る想定。
- **インプットの中身**: 当該週の各日（`todayKey` まで）について、朝・晩の項目を `【日付】` 見出し付きブロックで並べる。値が無い自由記述は **`無し`**。実行状況・ブレーキ・満足度など列挙型も未定義時は **`無し`** 表記に寄せる。
- **検証**: 連結テキスト全体が **`AI_REPORT_INPUT_MIN_TOTAL_CHARS`（150）Unicode 文字以上**（`src/lib/journalAiReportWriteMode.ts`）。不足時は 400。
- **成功レスポンス**: `{ reports: { actionAspect, outcomeAspect, psychologyAspect, insightGrowth }, charCountTotal?, usageTotalTokenCount? }`（JSON 本文のみ。トークンは `usageTotalTokenCount` で分離）。
- **Firestore 反映**: 4 キーを週報の 4 欄へマッピング。**既存入力**は `weeklyAiReportWriteMode` に従う（上書きしない／上書き／追記）。
- **出力の目安**（プロンプト）: 各観点 100〜200 文字目安・合計 800 文字以内・見出し＋本文など。サーバは各セクション最大 **200** 文字付近でトリム（`route.ts` の `MAX_SECTION_CHARS`）。
- **プロンプトログ**: `ENABLE_AI_PROMPT_LOG = true`（本番ではオフ推奨。`route.ts` 定数で切替）。

### 9.3 `POST /api/ai/weekly-improvement`

- **Body**: `{ "weeklyImprovementInputText": string }` — 週報の参照 **8 項目**を `【ラベル】` 固定順で連結（`src/lib/weeklyImprovementAi.ts`）。**各ブロック本文は Unicode 10 文字以上**（API でも再検証）。
- **成功レスポンス**: `{ suggestion: string, charCount, usageTotalTokenCount? }` — `suggestion` はプレーン1本（見出し＋改行＋本文。**100〜500 文字**を目安にサーバ側で句点付近までトリム。上限 `MAX_SUGGESTION_CHARS = 500`）。**トークンは本文に含めない**。
- **UI**: プレビュー表示時のみ `suggestion` と `usageTotalTokenCount` を結合し、文末に `（使用トークン合計: N）` を付ける。**Firestore の本文**はユーザーが「Ai改善提案に保存」したときのみ `aiImprovementSuggestionText` に書く（プレビュー破棄なら本文は未保存のまま）。**当日カウンタ**は API 成功直後に更新する（プレビュー保存の有無とは無関係）。来週への改善点への自動転記はしない。
- **プロンプトログ**: `ENABLE_AI_PROMPT_LOG = false`（`route.ts`）。

### 9.4 関連ファイル（週次）

| 種別 | パス |
|------|------|
| API | `src/app/api/ai/weekly-report/route.ts` |
| API | `src/app/api/ai/weekly-improvement/route.ts` |
| 入力連結・検証定数 | `src/lib/weeklyImprovementAi.ts`、`weeklyAiReportInputFromDailies.ts` |
| UI | `src/components/trial/TrialWeekly.tsx` |
| 永続化 | `src/lib/firestore.ts`（`JournalWeeklyPlain` / `saveJournalWeeklyPlain`） |
| 表示レベル | [04_TRIAL_28_IMPLEMENTATION_DECISIONS.md](./04_TRIAL_28_IMPLEMENTATION_DECISIONS.md) **§4.y**（正本）、実装 `src/lib/journalDetailLevel.ts` + `JournalDetailLevelContext` |

---

## 10. 月タブ: `POST /api/ai/monthly-report` と `POST /api/ai/monthly-improvement`

### 10.1 共通（月次）

- **認証・モデル・REST**は §4 と同様。
- **月次の実行回数**は `journal_monthly` に**機能別**に保持し、**JST 同一日の成功回数のみ**加算（失敗・422・502 は含めない）。
  - **Aiレポート**: `monthlyAiReportRunCount` / `monthlyAiReportRunDateKey`
  - **Ai改善提案**: `monthlyAiImprovementRunCount` / `monthlyAiImprovementRunDateKey`
- **上限**: **1 日あたり 3 回まで**（`TrialMonthly.tsx` の `MONTHLY_AI_DAILY_LIMIT`。週・朝晩のカウンタとは独立）。
- **Aiレポートの反映モード**: 週次と同じく **`users/{uid}.weeklyAiReportWriteMode`**（キー名は週次のまま。月次 UI からも参照）。
- スキーマの正本: [03_FIRESTORE_DATABASE_STRUCTURE.md](./03_FIRESTORE_DATABASE_STRUCTURE.md) §2.x-3 および §2.x-3-0。

### 10.2 `POST /api/ai/monthly-report`

- **Body**: `{ "monthlyInputText": string }` — クライアントは **`buildMonthlyAiReportInputFromWeeklies`**（`src/lib/monthlyAiReportInputFromWeeklies.ts`）と同等の本文を送る想定。
- **インプットのソース**: **暦月（JST `YYYY-MM`）内に `weekStartKey` が入る週**だけを対象に、`journal_weekly` の所定フィールドを週ごとに見出し付きで連結する（`listWeekStartKeysInCalendarMonth` + 各週の `JournalWeeklyPlain`）。週が暦月をまたいでも、**週の開始日がどの暦月に属するか**で当月／他月に振り分ける（一般的な「週開始基準」）。
- **欠損**: 各フィールドが空なら本文上は **`無し`**。
- **検証**: 連結全体が **150 文字以上**（定数は週次と共通 `AI_REPORT_INPUT_MIN_TOTAL_CHARS`）。
- **成功レスポンス**: 週次と同型の `reports` 4 キー。Firestore では **`monthlyActionReviewText`** / **`monthlyOutcomeReviewText`** / **`monthlyPsychologyText`** / **`insightAndLearningText`**（月次ドキュメント）へ反映。反映モードは `weeklyAiReportWriteMode`。
- **出力の目安・トリム**: 週次レポート（§9.2）と同方針（各 100〜200 文字目安・合計 800 以内・セクション最大 200）。
- **プロンプトログ**: `ENABLE_AI_PROMPT_LOG = false`（`monthly-report/route.ts`）。

### 10.3 `POST /api/ai/monthly-improvement`

- **Body**: `{ "monthlyImprovementInputText": string }` — 月報の参照項目を `【ラベル】` 固定順で連結（`src/lib/monthlyImprovementAi.ts` の `MONTHLY_IMPROVEMENT_INPUT_SECTIONS`）。**8 項目は各 10 文字以上**。**「特記事項（その他自由欄）」は任意**（`minChars: 0` のため API の短欄検証から除外）。
- **成功レスポンス**: 週次改善提案と同型。**100〜500 文字**目安・上限 500。**トークンは本文に含めない**。
- **UI・カウンタ・保存**: 週次改善提案（§9.3）と同様の考え方。保存先は `journal_monthly` の `aiImprovementSuggestionText`。
- **プロンプトログ**: `ENABLE_AI_PROMPT_LOG = false`（`route.ts`）。

### 10.4 関連ファイル（月次）

| 種別 | パス |
|------|------|
| API | `src/app/api/ai/monthly-report/route.ts`、`monthly-improvement/route.ts` |
| 入力連結 | `monthlyAiReportInputFromWeeklies.ts`、`monthlyImprovementAi.ts` |
| UI | `src/components/trial/TrialMonthly.tsx` |
| 週キー列挙 | `src/lib/journalWeek.ts`（`listWeekStartKeysInCalendarMonth`） |

---

## 11. プロンプト・入力連結

**同期ルール**: プロンプトを変更するときは、まず `src/app/api/ai/*/route.ts`（およびクライアントの入力連結）を更新し、本節を同内容に書き換える。

| 節 | 状態 | 内容 |
|----|------|------|
| **§11.0** | **確定**（§4.z・2026-07） | 晩 AI プロンプト・入力連結・API 定数 |
| **§11.1〜§11.3** | **旧 UI**（参考） | `actionResultText` 連結と旧プロンプト |
| **§11.4〜§11.7** | **現行** | 週・月のレポート／改善プロンプト |

UI・表示レベルの正本: [04_TRIAL_28_IMPLEMENTATION_DECISIONS.md](./04_TRIAL_28_IMPLEMENTATION_DECISIONS.md) **§4.z**。フィールド定義: [03_FIRESTORE_DATABASE_STRUCTURE.md](./03_FIRESTORE_DATABASE_STRUCTURE.md) §2.x・§2.x-1。

---

### 11.0 確定（§4.z）— 晩 Aiコーチプロンプト・入力・定数

**コード正本**: `src/lib/eveningAiImprovementInput.ts`（`buildEveningReflectionText` / `buildImprovementApiPrompt` / 定数）。  
**API 正本**: `src/app/api/ai/improvement/route.ts`（`MAX_SUGGESTION_CHARS = 500`、`MIN_REFLECTION_TEXT_CHARS = 50`、`EXPAND_BELOW_CHARS = 350`）。

#### 11.0.1 API リクエスト（`POST /api/ai/improvement`）

| フィールド | 必須 | 内容 |
|------------|------|------|
| `reflectionText` | はい | 晩 **項目3〜8** を下表の **AI 連結見出し** で `\n\n` 連結。空欄はブロックごと省略 |
| `userQuestion` | いいえ | 晩 **項目9**（`eveningAiQuestionText`）。実行条件（50文字）には **含めない** |

**実行条件**: `reflectionText` の Unicode 合計 **50 文字以上**。同一日 **3 回**まで（`eveningAiSuggestionRunCount`）。

**後方互換**: 実装時に `actionResultText` の併存期間を設けるかはコード側で判断。

#### 11.0.2 `reflectionText` の連結ブロック（項目3〜8）

空でない欄のみ出力。見出しは UI の疑問形をそのまま使う（先頭 `・` は UI 用で、連結時は見出し行のみ）。

| 項目 | UI 見出し（連結時の1行目） | Firestore（平文） | 値の例 |
|------|---------------------------|-------------------|--------|
| 3 | 今日印象に残ったできごとは何でしたか？ | `eveningResultExecutionText` | 自由記述 |
| 4 | その時、どんな気持ちになりましたか？ | `eveningEmotionThoughtText` | 自由記述 |
| 5 | その時、どのような考えが思い浮かびましたか？ | `eveningReflectionThoughtText` | 自由記述（**新規**） |
| 6 | そこから、なにか気づくことはありましたか？ | `eveningBrakeWorkedText` | 自由記述（旧ブレーキ欄の流用） |
| 7 | この出来事から何を学びましたか？ | `eveningInsightText` | 自由記述 |
| 8 | 今日の学びをどう明日に活かしますか？ | `eveningImprovementText` | 自由記述 |

**連結例**（2項目のみ入力した場合）:

```
今日印象に残ったできごとは何でしたか？
会議で自分の意見を言えた。

その時、どんな気持ちになりましたか？
少し緊張したが、言えてほっとした。
```

**含めないもの**: 朝の入力、◇行動（項目1・1.a・2）、◇明日の行動（項目12〜14）、項目9（質問は `userQuestion`）、項目10（応答）。**ブレーキ enum・反論関連フィールドは一切含めない**。

#### 11.0.3 週次レポート入力（`buildWeeklyAiReportInputFromDailies` 改訂案）

当該週の各日について `【日付】YYYY-MM-DD` のあと、次の構造で連結する（値なしは **`無し`**）。

**朝（変更なし）**

```
【今日の行動】
- 行動目標: …
- 行動内容: …
```

**晩 — ◇行動**

```
【行動】
- 行動目標に対してどのくらい実施できましたか？: およそできた／まあまあできた／あまりできなかった／無し
- どのように行動できましたか？: …（無し可）
- 行動の満足度を10点のうちどのくらいでしたか？: N/10 または 無し
```

**晩 — ◇気づき**（旧【こころのブレーキ】節は **廃止**）

```
【気づき】
- 今日印象に残ったできごとは何でしたか？: …
- その時、どんな気持ちになりましたか？: …
- その時、どのような考えが思い浮かびましたか？: …（新規）
- そこから、なにか気づくことはありましたか？: …
- この出来事から何を学びましたか？: …
- 今日の学びをどう明日に活かしますか？: …
```

**晩 — ◇明日の行動**（【明日の行動】として常に出力。値なしは `無し`）

```
【明日の行動】
- 明日の行動目標（1文）: …
- 明日の行動内容: …
```

**含めない**: `eveningAiQuestionText`、生成済み `eveningAiSuggestionText`、UI 非表示の旧フィールド（`eveningResultText`、`eveningBrake` 系など）。

#### 11.0.4 プロンプト全文（写し）

`buildImprovementApiPrompt(reflectionText, userQuestion)` が組み立てるテンプレート。末尾の `{reflectionText}` / 質問行は実行時に差し替え。

```
あなたは日々の出来事から気づきを促す日本語コーチです。
最下段の文章は、クライアントが以下の項目に対して入力した内容に対して改行区切りで連結したものです。

【入力項目】
a.今日印象に残ったできごとは何でしたか？
b.その時、どんな気持ちになりましたか？
c.その時、どのような考えが思い浮かびましたか？
d.そこから、なにか気づくことはありましたか？
e.この出来事から何を学びましたか？
f.今日の学びをどう明日に活かしますか？
g.Aiコーチに聞きたい事はありますか？

（中略 — 出力内容・制約はコード正本と同一）

---
クライアントが入力した文章

【本日の学びへの入力】
{reflectionText}
【クライアントからの質問】
{userQuestion または「（なし）」}
```

**短文時の拡張**（350 文字未満で 1 回）: 上記プロンプト末尾に下書きを追記し、「400〜500文字、見出し+文章の形で拡張」を指示。

#### 11.0.5 旧プロンプトとの差分（参考）

| 論点 | 旧（§11.2） | 現行（§11.0） |
|------|-------------|---------------|
| 入力 | 朝・晩・ブレーキ含む `actionResultText` | `reflectionText`（a〜f）+ `userQuestion`（g） |
| 入力下限 | 10 文字 | **50 文字** |
| 出力 | 160〜300 文字 | **400〜500 文字** |
| サーバ上限 | 300 | **500** |

---

### 11.1 クライアント入力連結 — 現行（旧 UI → `actionResultText`）

`TrialMorningEvening.tsx` の `buildAiReflectionInputText` が、空でない欄だけを `【見出し】` 付きブロックで `\n\n` 連結する。

| 見出し | ソースフィールド |
|--------|------------------|
| 【朝・今日の行動目標（1文）】 | `morningTodayActionText` |
| 【行動の実行状況】 | `eveningExecution`（ラベル化） |
| 【具体的な行動内容】 | `eveningSpecificActionsText` |
| 【行動の結果】 | 満足度・補足・結果・目標進捗をサブ行で連結 |
| 【行動時の感情・思考】 | `eveningEmotionThoughtText` |
| 【こころのブレーキ】 | ブレーキ有無・内容・反論・反論の言葉 |
| 【今日の気づき・感動・学びと課題】 | `eveningInsightText` |
| 【自分の書いた明日への改善点】 | `eveningImprovementText` |

### 11.2 `POST /api/ai/improvement` — 初回プロンプト（現行・旧 UI）

実装: `src/app/api/ai/improvement/route.ts`（`actionResultText` を末尾に連結）。

```
あなたは行動改善を支援する日本語コーチです。
以下の【本日の振り返り入力】は、クライアントが複数の欄を改行区切りで連結したものです。
【含まれうる項目】
朝の目標、実行状況、行動の結果（どのようにできたか・目標への近づき等）、行動時の感情・思考、こころのブレーキ（種類・反論できたか・反論の言葉）、気づき・感動・学びと課題、利用者が先に書いた「明日への改善点」。
【ブレーキと反論】
こころのブレーキ（行動を抑制する働き）が働いた場合は、記述されている「どんなブレーキか」「反論の有無」「反論で使った言葉」を特に重視し、受容したうえで次の一歩に活かす提案をする。

出力は次の2つの意図を見出しと文章の構成で書いてください。
　- 内容の優先順位
実行状況と行動の結果 → 感情・思考と気づき・感動・学びと課題 → ブレーキと反論の言葉 →（あれば）利用者の明日への改善点。余裕があれば朝の目標との整合にも触れてよい。
　- 構成の目安
合計は160〜300文字。見出し+文章の形で出力する。
前半: 受容・共感・承認。できたこと・努力・ブレーキに対する反論など事実を踏まえて1〜3文（目安 50〜100文字）。
後半: 明日への改善の機会。思考（別の捉え方）・行動（小さく試せる一歩）・感情（和らげ方や気づき）を自然な文に溶かす（目安 100〜200文字）。
【制約】
- 日本語のみ。
- 否定や断定を避け、実行しやすい提案にする
- 100文字未満の短文にしない
- 文末は必ず完結した文（「。」または「！」や「？」）で終える
- 300文字に近づく場合は、最後の1文を省略しても文を途中で切らない
- 300文字を超えないよう、前半と後半のバランスを調整する

---
【本日の振り返り入力】
{actionResultText}
```

### 11.3 `POST /api/ai/improvement` — 短文時の拡張プロンプト（最大 1 回）

初回応答が `MIN_SUGGESTION_CHARS`（100）未満のとき、§11.2 の全文の末尾に次を追記して再呼び出しする。

```
---
前回の下書き（短すぎたため拡張してください）:
{前回の suggestion}

この下書きを土台に、意味を変えず、情報を補って160〜300文字、見出し+文章の形で拡張してください。
```

### 11.4 `POST /api/ai/weekly-report`（現行・旧晩ラベル）

実装: `src/app/api/ai/weekly-report/route.ts`（`weeklyInputText` を末尾に連結）。入力は `buildWeeklyAiReportInputFromDailies` 相当。

```
以下の【週次統合入力】は、当該週の各日について朝・晩の気づきノートを日付ごとにラベル付きで連結したものです。
入力に値がなかった箇所は「無し」と記載されています。

この内容を踏まえ、次の4キーを持つ JSON オブジェクトのみを返してください（必須）。
- actionAspect … 行動面の要約（クライアント画面の「行動の振り返り」欄に相当する下書き）
- outcomeAspect … 成果面の要約（「成果への振り返り」欄に相当）
- psychologyAspect … 心理面の要約（「行動時の思考・感情の変化」欄に相当）
- insightGrowth … 気づき・学び・成長（同名列に相当）

【各レポート項目の構成の目安】
- 各テーマごとに「見出し（内容を示す短いリード）」改行「本文」の順とする。
- 各項目の本文は 100 文字以上 200 文字以下を目安とする（Unicode）。
- 4 項目の合計は 800 文字以内。
- 200 文字に近づくときは最後の 1 文を省略してもよいが、文を途中で切らない。

【制約】
- 日本語のみ。
- 否定や断定を避け、実行しやすい表現にする。
- 場合によって箇条書きも可とするが、必ずリード文を記載した上で箇条書きに移ること。箇条書きのみで終えない。
- 「である調」を基準に報告書風に表現してよい。
- 文末は必ず完結した文（「。」または「！」または「？」）で終える。

【重要】出力は JSON オブジェクトのみ。前後の説明文や Markdown は禁止。

---
【週次統合入力】
{weeklyInputText}
```

### 11.5 `POST /api/ai/weekly-improvement`

実装: `src/app/api/ai/weekly-improvement/route.ts`。入力は `weeklyImprovementInputText`（`src/lib/weeklyImprovementAi.ts` の 8 項目を `【ラベル】` 固定順で連結）。

```
あなたは行動改善を支援する日本語コーチです。
以下の【今週の振り返り入力】は、クライアントの週報からの項目欄を改行区切りで連結したものです。

【含まれる項目（いずれもクライアント入力済み・各10文字以上）】
「行動目標」「行動内容」「行動の振り返り」「成果の振り返り」
「心理面　行動時の思考・感情の変化」「気づき・学び・成長」
「課題と原因の深掘り」「来週への改善点」

【出力形式（必須）】
- プレーンテキストを**1本だけ**出力する（JSON・コードブロック・前後の説明文は禁止）。
- 1行目: 全体を言い表す見出し文（目安 32 文字前後・1 文で完結）。
- 見出し行の直後に 1 回だけ改行し、その次の行から本文を開始する（見出しと本文のあいだに空行は入れない）。
- 本文中の段落分けに空行を使うのは可。
- 見出し・改行・本文を合算した Unicode 文字数で**300〜500 文字**を目安とする。

【出力内容】
これらの項目のうち、行動目標および課題と原因を踏まえ、来週に活かせる改善内容を提案してください。
行動や成果への振り返り、特に心理面や気づき・学び・成長で記述されている言葉を引用しながら、
クライアントへの受容・共感・承認をベースに次の一歩に活かす提案をしてください。

【制約】
- 日本語のみ。
- 否定や断定を避け、実行しやすい提案にする。
- サーバ検証のため、見出しと本文を合わせて**100 文字以上 500 文字以下**になるようにする（短文にしない）。
- 文末は必ず完結した文（「。」または「！」や「？」）で終える。
- 長さが上限に近いときは、最後の 1 文を省略してもよいが、文を途中で切らない。

---
【今週の振り返り入力】
{weeklyImprovementInputText}
```

### 11.6 `POST /api/ai/monthly-report`

実装: `src/app/api/ai/monthly-report/route.ts`（`monthlyInputText` を末尾に連結）。入力は `buildMonthlyAiReportInputFromWeeklies` 相当。週次レポート（§11.4）と同一の JSON 4 キー・文字数制約。

```
以下の【月次統合入力】は、当該暦月に属する各週の週次気づきノート（journal_weekly 相当）の所定フィールドを、週ごとに見出し付きで連結したものです。
週の列挙は「週の開始日がその暦月内にある週」を対象とします（週が月境界をまたぐ場合も、開始日が月内なら当該月のインプットに含めます）。
入力に値がなかった箇所は「無し」と記載されています。

この内容を踏まえ、次の4キーを持つ JSON オブジェクトのみを返してください（必須）。
- actionAspect … 行動面の要約（月次画面の「行動の振り返り」欄に相当する下書き）
- outcomeAspect … 成果面の要約（「振り返り」成果面欄に相当）
- psychologyAspect … 心理面の要約（「行動時の思考・感情の変化」欄に相当）
- insightGrowth … 気づき・学び・成長（同名列に相当）

【各レポート項目の構成の目安】
- 各テーマごとに「見出し（内容を示す短いリード）」改行「本文」の順とする。
- 各項目の本文は 100 文字以上 200 文字以下を目安とする（Unicode）。
- 4 項目の合計は 800 文字以内。
- 200 文字に近づくときは最後の 1 文を省略してもよいが、文を途中で切らない。

【制約】
- 日本語のみ。
- 否定や断定を避け、実行しやすい表現にする。
- 場合によって箇条書きも可とするが、必ずリード文を記載した上で箇条書きに移ること。箇条書きのみで終えない。
- 「である調」を基準に報告書風に表現してよい。
- 文末は必ず完結した文（「。」または「！」または「？」）で終える。

【重要】出力は JSON オブジェクトのみ。前後の説明文や Markdown は禁止。

---
【月次統合入力】
{monthlyInputText}
```

### 11.7 `POST /api/ai/monthly-improvement`

実装: `src/app/api/ai/monthly-improvement/route.ts`。入力は `monthlyImprovementInputText`（`src/lib/monthlyImprovementAi.ts` の 9 項目。特記事項は任意）。

```
あなたは行動改善を支援する日本語コーチです。
以下の【今月の振り返り入力】は、クライアントの月報からの項目欄を改行区切りで連結したものです。

【含まれる項目】特記事項以外はクライアント入力済みで各10文字以上。特記事項は任意。
「行動目標」「行動内容」「行動の振り返り」「成果の振り返り」
「心理面　行動時の思考・感情の変化」「気づき・学び・成長」
「課題と原因の深掘り」「来月への改善点」「特記事項（その他自由欄）」

【出力形式（必須）】
- プレーンテキストを**1本だけ**出力する（JSON・コードブロック・前後の説明文は禁止）。
- 1行目: 全体を言い表す見出し文（目安 32 文字前後・1 文で完結）。
- 見出し行の直後に 1 回だけ改行し、その次の行から本文を開始する（見出しと本文のあいだに空行は入れない）。
- 本文中の段落分けに空行を使うのは可。
- 見出し・改行・本文を合算した Unicode 文字数で**300〜500 文字**を目安とする。

【出力内容】
これらの項目のうち、行動目標および課題と原因を踏まえ、来月に活かせる改善内容を提案してください。
行動や成果への振り返り、特に心理面や気づき・学び・成長で記述されている言葉を引用しながら、
クライアントへの受容・共感・承認をベースに次の一歩に活かす提案をしてください。

【制約】
- 日本語のみ。
- 否定や断定を避け、実行しやすい提案にする。
- サーバ検証のため、見出しと本文を合わせて**100 文字以上 500 文字以下**になるようにする（短文にしない）。
- 文末は必ず完結した文（「。」または「！」や「？」）で終える。
- 長さが上限に近いときは、最後の 1 文を省略してもよいが、文を途中で切らない。

---
【今月の振り返り入力】
{monthlyImprovementInputText}
```

### 11.8 更新履歴（本書）

| 日付 | 内容 |
|------|------|
| 2026-07-03 | §11.0 確定: 晩 AI プロンプト（400〜500字）・`reflectionText`/`userQuestion` API・`MAX_SUGGESTION_CHARS=500`。実装: `eveningAiImprovementInput.ts` |
| 2026-06-24 | §11.0 追加（§4.z 改訂予定の見出し・データ・API 入力対照）。§11.1〜 を現行（旧 UI）と明記 |
| 2026-06-24 | `docs/` 直下から `manabiba_01/04_VERTEX_AI_TRIAL_IMPROVEMENT.md` へ移動。§11 に全 API プロンプト全文を追加 |
