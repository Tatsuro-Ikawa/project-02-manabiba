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
  - 入力は `buildAiReflectionInputText` で複数フィールドをラベル付きブロックに連結し、リクエストボディの `actionResultText` に載せる（キー名は後方互換のためそのまま）。  
  - **合計10文字未満**のときは実行不可（API でも 400）。  
  - **同一日あたり 3 回**まで実行（`eveningAiSuggestionRunCount` を Firestore に保存。API 単体の強制ではない）。  
  - 生成結果は任意で **「Aiコーチからのコメントを保存」** により `eveningAiSuggestionText` に永続化。  
  - `POST /api/ai/improvement` を `fetch` で呼び出す（相対パス）。
- **API ルート**: `src/app/api/ai/improvement/route.ts`  
  - `runtime = 'nodejs'`  
  - **Vertex AI REST** の `generateContent` を `google-auth-library` のアクセストークンで呼び出す（Turbopack と Vertex Node SDK の相性問題を避けるため、SDK 直利用はしていない）。  
  - 本文は **100〜300 文字**を目安にし、**160〜300 文字**をプロンプトで指示。短文時は **最大 1 回**だけ拡張用の追いプロンプトで再呼び出しする。  
  - 応答末尾に、Vertex の `usageMetadata.totalTokenCount` を集計した **`（使用トークン合計: N）`** をサーバー側で付与（初回＋拡張の 2 回呼び出し時は合算）。  
  - `generationConfig.maxOutputTokens` は **4000**（内部推論 `thoughtsTokenCount` 等で `MAX_TOKENS` 打切りを減らすため。出力本文が常に 4000 トークンになるわけではない）。

プロダクト上の役割分担の正本は [manabiba_01/03_JOURNAL_COACH_AI_PLANS_AND_CAPABILITIES.md](./manabiba_01/03_JOURNAL_COACH_AI_PLANS_AND_CAPABILITIES.md) を参照してください。

### 1.1 開発用コンソールログ

検証用に `prompt` / 応答本文 / `aiJson` を `console.info` するコードがあるが、**現在は `ENABLE_AI_PROMPT_LOG = false` で無効**。再有効化する場合は `src/app/api/ai/improvement/route.ts` 内の定数を編集する（個人情報がログに出るため本番ではオフ推奨）。

---

## 2. 環境変数（`.env.local`）

**リポジトリにコミットしないこと。** 鍵 JSON は `.gitignore` 対象外のパスに置かない運用を推奨します。

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `GOOGLE_CLOUD_PROJECT` | はい | GCP プロジェクト ID（例: `plandosee-project-01`） |
| `GCP_SA_KEY_JSON` | 推奨（Vercel） | サービスアカウント鍵 JSON の**全文文字列**。設定時はこれを優先して認証する |
| `GOOGLE_APPLICATION_CREDENTIALS` | ローカルで推奨 | **サービスアカウント鍵の JSON ファイル**への絶対パス。**ディレクトリやプロジェクトルートは不可** |
| `GOOGLE_CLOUD_LOCATION` | いいえ | 既定: `asia-northeast1`。モデルリソース名の `locations/...` に使う |
| `VERTEX_AI_GEMINI_MODEL` | いいえ | 既定: `gemini-2.5-flash`（コード側フォールバックと一致） |

認証の優先順位は **`GCP_SA_KEY_JSON` → `GOOGLE_APPLICATION_CREDENTIALS`**。  
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
{ "actionResultText": "本日の振り返り（複数欄を連結したテキスト。合計10文字以上）" }
```

実装では `TrialMorningEvening` が朝の目標・実行状況・結果・感情・ブレーキ・気づき・明日への改善点などを `【…】` 見出し付きで連結して渡す。

### 5.2 成功レスポンス

```json
{
  "suggestion": "見出し+本文（160〜300文字目安）。末尾に改行で（使用トークン合計: N）が付く場合あり",
  "charCount": 0,
  "usageTotalTokenCount": 0
}
```

- `suggestion` … 本文の後に、取得できた場合のみ `（使用トークン合計: N）` が続く（`N` は当該 API 呼び出し内の Vertex `usageMetadata.totalTokenCount` の合算）。  
- `charCount` … `suggestion` 全体の Unicode コードポイント数。  
- `usageTotalTokenCount` … 上記 `N` と同値。取得できない場合はフィールド省略可。

### 5.3 エラー時（例）

- **400**: 本文欠如、10文字未満、JSON 不正  
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
| UI（朝・晩） | `src/components/trial/TrialMorningEvening.tsx` |
| API（週・レポート／改善） | `src/app/api/ai/weekly-report/route.ts`、`src/app/api/ai/weekly-improvement/route.ts` |
| API（月・レポート／改善） | `src/app/api/ai/monthly-report/route.ts`、`src/app/api/ai/monthly-improvement/route.ts` |
| UI（週） | `src/components/trial/TrialWeekly.tsx` |
| UI（月） | `src/components/trial/TrialMonthly.tsx` |
| レポート用インプット生成 | `src/lib/weeklyAiReportInputFromDailies.ts`、`src/lib/monthlyAiReportInputFromWeeklies.ts`、`src/lib/journalWeek.ts`（`listWeekStartKeysInCalendarMonth`） |
| レポート反映モード | `src/lib/journalAiReportWriteMode.ts`（`AI_REPORT_INPUT_MIN_TOTAL_CHARS`、`applyAiReportWriteMode`） |
| スタイル（ボタン状態など） | `src/styles/home-trial.css` |
| 依存 | `package.json` の `google-auth-library` |

設計書索引: [manabiba_01/00_README.md](./manabiba_01/00_README.md)

---

## 9. 週タブ: `POST /api/ai/weekly-report` と `POST /api/ai/weekly-improvement`

### 9.1 共通（週次）

- **認証・モデル・REST URL**は §4 と同様（`GOOGLE_CLOUD_PROJECT` / `GCP_SA_KEY_JSON` / `VERTEX_AI_GEMINI_MODEL`）。
- **週次の実行回数**は `journal_weekly` に**機能別**に保持し、**JST の同一日（`YYYY-MM-DD`）における成功回数のみ**加算する（失敗・422・502 はカウントしない）。
  - **Aiレポート作成**: `weeklyAiReportRunCount` / `weeklyAiReportRunDateKey`
  - **Ai改善提案**: `weeklyAiImprovementRunCount` / `weeklyAiImprovementRunDateKey`
- **上限**: いずれも **1 日あたり 3 回まで**（`TrialWeekly.tsx` の `WEEKLY_AI_DAILY_LIMIT`。朝・晩の 3 回とは独立）。
- **Aiレポートの反映モード**（週・月で共通）: `users/{uid}.weeklyAiReportWriteMode` を参照（`append`／`overwrite`／`skip_if_nonempty`＝既存入力がある欄は変更しない）。未設定時は UI では `append` 相当。設定 UI: `/trial_4w/settings`。
- スキーマ・入力対照の正本: [manabiba_01/03_FIRESTORE_DATABASE_STRUCTURE.md](./manabiba_01/03_FIRESTORE_DATABASE_STRUCTURE.md) §2.x-2（週次）および §2.x-2-0 / §2.x-2-1。

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
| 表示レベル | `src/lib/journalDetailLevel.ts` + `JournalDetailLevelContext` |

---

## 10. 月タブ: `POST /api/ai/monthly-report` と `POST /api/ai/monthly-improvement`

### 10.1 共通（月次）

- **認証・モデル・REST**は §4 と同様。
- **月次の実行回数**は `journal_monthly` に**機能別**に保持し、**JST 同一日の成功回数のみ**加算（失敗・422・502 は含めない）。
  - **Aiレポート**: `monthlyAiReportRunCount` / `monthlyAiReportRunDateKey`
  - **Ai改善提案**: `monthlyAiImprovementRunCount` / `monthlyAiImprovementRunDateKey`
- **上限**: **1 日あたり 3 回まで**（`TrialMonthly.tsx` の `MONTHLY_AI_DAILY_LIMIT`。週・朝晩のカウンタとは独立）。
- **Aiレポートの反映モード**: 週次と同じく **`users/{uid}.weeklyAiReportWriteMode`**（キー名は週次のまま。月次 UI からも参照）。
- スキーマの正本: [manabiba_01/03_FIRESTORE_DATABASE_STRUCTURE.md](./manabiba_01/03_FIRESTORE_DATABASE_STRUCTURE.md) §2.x-3 および §2.x-3-0。

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
