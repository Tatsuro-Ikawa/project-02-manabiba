# サブスク状態遷移・外部仕様（草案）

## 📋 ドキュメント情報

| 項目 | 内容 |
|------|------|
| **目的** | 入会・コース選択・ログアウト・ダウングレード時の **UI／導線／機能可否** を一覧化する。実装・テストの正本とする。 |
| **ステータス** | **草案**（2026-05-25）。プロダクト表「サブスクコース選択の変化」12枚＋「コース別の使用可能機能一覧」＋ plan×primaryCourse マトリクスを反映。 |
| **参照** | [04_SUBSCRIPTION_PRODUCT_SCOPE.md](./04_SUBSCRIPTION_PRODUCT_SCOPE.md)、[04_HOME_SCREEN_IMPLEMENTATION.md](./04_HOME_SCREEN_IMPLEMENTATION.md)、[04_TEST_ONBOARDING_CHECKLIST.md](./04_TEST_ONBOARDING_CHECKLIST.md) |

---

## 1. 読み方

### 1.1 チェックの進め方（2026-06-14〜）

**ゲスト起点の入会（表1・表2 相当）** は、次の2段階で確認する。

| 段階 | 内容 | ドキュメント上の位置 |
|------|------|----------------------|
| **画面遷移（導線フロー）** | 外部仕様フローチャートを Mermaid 化。最終分岐に **導線No**（①〜⑧） | §5.0（フリー）、§5.1（スタンダード）、§5.2（プレミアム） |
| **導線チェックリスト** | 導線No ごとの E2E シーケンス・結果・備考 | 各 § の直下 |
| **申込手順（デモ）** | スタンダード／プレミアムの申込フォーム確認（A-1〜A-6） | §5.1・§5.2 のチェックリスト直下 |

**表6〜12**（会員種別間の UI 項目別チェック）は、順次 **導線フロー＋チェックリスト** へ移行予定。移行完了までは §5 に旧形式の表を残す（旧 **表3** は §5.2、旧 **表4** は §5.3、旧 **表5** は §5.4、旧 **表6** は §5.5 へ移行済）。

### 1.2 遷移表（表3〜12）の列（旧形式・移行中）

| 列 | 意味 |
|----|------|
| **左列** | **変化前**の会員種別 |
| **右列** | **変化後**の会員種別 |

表題の「A→B」と列見出し（A｜B）を一致させる。

### 1.3 記号

| 記号 | 意味 |
|------|------|
| **有効** | 表示・操作可能 |
| **無効** | 非表示、または操作不可（必要に応じて案内メッセージ） |
| **—** | 当該画面・文脈では該当なし |
| **選択中** | ランディング等で現在のコースとして表示 |
| **選択** | コース変更画面で他コースへ変更可能 |

### 1.4 会員種別と Firestore

| 表示 | `subscription.plan` | 備考 |
|------|---------------------|------|
| **ゲスト** | （未認証） | ロールなし |
| **フリー会員** | `free` | 7日間スタートプログラム（ダミー）向け。28日お試しなし |
| **スタンダード** | `standard` | 気づきノート＋AI。メッセージボードなし |
| **プレミアム** | `premium` | 上記＋メッセージボード（Q&A）等 |

**補足**: ノート導線の可否は `enrollment.primaryCourse`（`start7d` / `kizuki`）も参照する（§4）。


### 1.5 実装後チェック（OK欄）

| 項目 | 内容 |
|------|------|
| **用途** | §3（定常状態）・§5（遷移表）の **OK** 列は、実装後の画面確認・手動テスト記録用 |
| **記入例** | `OK`、`NG: 理由`、`2026-05-25 確認`、担当者イニシャル |
| **正本** | Excel 表と本 Markdown を **行番号（#列）** で突合 |
| **関連** | [04_TEST_ONBOARDING_CHECKLIST.md](./04_TEST_ONBOARDING_CHECKLIST.md)（導線テスト）、本書 §3・§5（UI可否） |

---

## 2. 全体方針（確定）

### 2.1 会員同意（A案）

| 場面 | 同意 |
|------|------|
| **初回入会**（ゲスト→フリー／STD／PRE） | `/consent` で **1回**（`users.{uid}.consents`）。7日間専用の二重同意は**廃止** |
| **既存会員のコースアップグレード**（例: フリー→STD、STD→PRE） | **再同意なし**（`consents` 済みなら申込・コース変更のみ） |
| **同意済み後の遷移** | `next` クエリ先へ直行（例: `/start-program`、`/trial_4w`） |

### 2.1.1 初回入会の導線（未同意ログイン直後）

表1（ゲスト→フリー）・表2（ゲスト→スタンダード）・表3（ゲスト→プレミアム）では、**ランディングは1回**（コース一覧で意思決定）。**コース選択**＝ランディング上で7日間／AIコーチ「やってみる」／プレミアム「申し込む」を押すこと。ログイン後にランディングへ戻さない（2026-06-07 外部仕様明確化）。確認は §5.0・§5.1・§5.2 の導線フロー＋チェックリストで行う。

**導線番号**（最終分岐の通し番号）と §5「**導線チェックリスト_1**　ゲスト→フリー」を参照。スタンダードは §5.1「**導線チェックリスト_2**」。プレミアムは §5.2「**導線チェックリスト_3**」。

| 導線No | 入口 | 最終到達 |
|--------|------|----------|
| ① | 試してみる → 7日間 → 同意 | スタートページ |
| ② | 試してみる → ランディング → 戻る | ゲストホーム |
| ③ | 試してみる → 7日間 → 同意 → キャンセル | ログオフ → ランディング（ゲスト） |
| ④ | ログインして続ける → ランディング → 7日間 → 同意 | スタートページ |
| ⑤ | ログインして続ける → ランディング → 戻る | ログオフ → ゲストホーム |
| ⑥ | ログインして続ける → ランディング → 7日間 → 同意 → キャンセル | ログオフ → ランディング（ゲスト） |
| ⑦ | 試してみる → 7日間（**既会員・start7d**） | スタート画面 |
| ⑧ | ログインして続ける（**既会員・start7d**） | スタート画面 |

**ゲスト → スタンダード（AIコーチ）** — フリーと同型（§5.1）。初回入会は同意後に **申込フォーム**（`/apply?plan=standard`、デモ）を経由する。

| 導線No | 入口 | 最終到達 |
|--------|------|----------|
| ① | 試してみる → AIコーチ → 同意 → **申込（デモ）** | 気づきノートページ |
| ② | 試してみる → ランディング → 戻る | ゲストホーム |
| ③ | 試してみる → AIコーチ → 同意 → キャンセル | ログオフ → ランディング（ゲスト） |
| ④ | ログインして続ける → ランディング → AIコーチ → 同意 → **申込（デモ）** | 気づきノートページ |
| ⑤ | ログインして続ける → ランディング → 戻る | ログオフ → ゲストホーム |
| ⑥ | ログインして続ける → ランディング → AIコーチ → 同意 → キャンセル | ログオフ → ランディング（ゲスト） |
| ⑦ | 試してみる → AIコーチ（**既会員・kizuki/STD**） | 気づきノートページ |
| ⑧ | ログインして続ける（**既会員・kizuki/STD**） | 気づきノートページ |

**ゲスト → プレミアム（パーソナルコーチ）** — フリー・スタンダードと同型（§5.2）。到達先は **気づきノートページ（プレミアム）**（`/trial_4w`）。初回入会は同意後に **申込フォーム**（`/apply?plan=premium`、デモ）を経由する。

| 導線No | 入口 | 最終到達 |
|--------|------|----------|
| ① | 試してみる → プレミアム「申し込む」→ 同意 → **申込（デモ）** | 気づきノートページ |
| ② | 試してみる → ランディング → 戻る | ゲストホーム |
| ③ | 試してみる → プレミアム → 同意 → キャンセル | ログオフ → ランディング（ゲスト） |
| ④ | ログインして続ける → ランディング → プレミアム → 同意 → **申込（デモ）** | 気づきノートページ |
| ⑤ | ログインして続ける → ランディング → 戻る | ログオフ → ゲストホーム |
| ⑥ | ログインして続ける → ランディング → プレミアム → 同意 → キャンセル | ログオフ → ランディング（ゲスト） |
| ⑦ | 試してみる → プレミアム（**既会員・PRE**） | 気づきノートページ |
| ⑧ | ログインして続ける（**既会員・PRE**） | 気づきノートページ |

| 場面 | 導線 |
|------|------|
| **ゲスト**がランディングでコース選択（7日間「やってみる」）→ ログイン | `login?next=/start-program` → `post-login` → **`/consent?next=/start-program`**（ランディング再表示なし） |
| **ゲスト**がランディングで気づきノート（AIコーチ）選択 → ログイン | `login?next=/apply?plan=standard` → `post-login` → **`/consent?next=/apply?plan=standard`**（**導線①・スタンダード**）→ 申込フォーム → `/trial_4w` |
| **ゲスト**がランディングでプレミアム（パーソナルコーチ）「申し込む」→ ログイン | `login?next=/apply?plan=premium` → `post-login` → **`/consent?next=/apply?plan=premium`**（**導線①・プレミアム**）→ 申込フォーム → `/trial_4w` |
| **初回の誤操作**（未同意・コース未選択で「ログインして続きから」、`next=/`） | **`/trial_4w/landing?needsConsent=1&next=/`** のみ（ここだけランディング2回目相当） |
| 誤操作経由でランディング（needsConsent）→ コース「やってみる」 | **`/consent?next=...`** |
| **誤操作経由ランディングで「戻る」**（`needsConsent=1`） | **ログオフ** → **`/`**（ゲストホーム） |
| **再ログイン**（同意済みで「ログインして続きから」、`next=/`） | **`start7d` のみ** → **`/start-program`**（**導線⑧・フリー**）。**`kizuki` / STD / PRE** → **`/trial_4w`**（**導線⑧・スタンダード／プレミアム**）。その他 → **`/`** |
| **再同意**（コース選択済み・未同意で `next=/`） | **`/consent?next=/`** → 同意後ホーム |
| **同意済み**でコース CTA | `post-login` または目的 URL へ直行 |
| **既会員（同意済み・kizuki/STD）**がゲストから「試してみる」→ AIコーチ → ログイン | **`/trial_4w` 直行**（**導線⑦・スタンダード**）。`login?next=/apply?plan=standard` → `resolveOnboardingDestination` |
| **既会員（同意済み・PRE）**がゲストから「試してみる」→ プレミアム「申し込む」→ ログイン | **`/trial_4w` 直行**（**導線⑦・プレミアム**）。`login?next=/apply?plan=premium` → `resolveOnboardingDestination` |
| **既会員（同意済み・PRE）**「ログインして続きから」 | **`/trial_4w`**（**導線⑧・プレミアム**、`resolvePostLoginDestination`） |
| **既会員（同意済み・start7d）**がゲストから「試してみる」→ 7日間 → ログイン | **`/start-program` 直行**（**導線⑦・フリー**） |
| **会員同意画面でキャンセル** | **ログオフ** → **`/trial_4w/landing`**（**導線③**／**導線⑥**） |
| **ヘッダーからログアウト**（気づきノート等） | **`/`**（ゲストホーム）。`signOutAndRedirect` ＋ 保護ページのランディング誤リダイレクト抑止 |

実装: `src/lib/onboardingFlow.ts`、`src/app/post-login/page.tsx`、`src/app/trial_4w/landing/page.tsx`、`src/components/subscription/ApplyFormPanel.tsx`

### 2.1.2 認証・同意の分岐フロー図（2026-06-05）

**URL の約束**: `/login?next=` には**最終行先のみ**を渡す。`/login` はログイン成功後に必ず `/post-login?next=<同じ行先>` へ遷移する。`next` に `/post-login?next=...` を入れると二重ラップになり分岐が壊れる（`normalizeAuthNext` で救済）。

#### 判定に使う値（Firestore `users/{uid}`）

§2.1.3 に検証用の全フィールド一覧あり。

| フィールド | 意味 | 未設定時 |
|------------|------|----------|
| `consents` | 利用規約・プライバシー同意（版一致で有効） | 未同意 |
| `enrollment.primaryCourse` | 初回選択コース（`start7d` / `kizuki`） | `null`＝コース未選択＝初回入会途中 |

#### `/post-login` 分岐（正本）

```mermaid
flowchart TD
  START["/post-login?next=N"] --> A{ログイン済み?}
  A -->|No| LOGIN["/login?next=/post-login?next=N"]
  A -->|Yes| B{userProfile 取得済?}
  B -->|No| WAIT["待機"]
  B -->|Yes| C{consents 現行版と一致?}
  C -->|Yes| RESOLVE{N = / ?}
  RESOLVE -->|Yes・start7d のみ| START7D["/start-program"]
  RESOLVE -->|Yes・その他| HOME["/"]
  RESOLVE -->|No| DEST["N へ replace"]
  C -->|No| D{N の値}
  D -->|N = /| E{primaryCourse 未設定?}
  E -->|Yes| LAND_HOME["/trial_4w/landing?needsConsent=1&next=/"]
  E -->|No| CONSENT_HOME["/consent?next=/"]
  D -->|N = /start-program 等| CONSENT_N["/consent?next=N"]
```

#### 入口別シーケンス

**① 初回・誤操作「ログインして続きから」**（NG_02）

```mermaid
sequenceDiagram
  participant H as ホーム（ゲスト）
  participant L as /login
  participant P as /post-login
  participant LD as /trial_4w/landing

  H->>L: next=/
  L->>P: next=/
  Note over P: consents 無し, primaryCourse 無し
  P->>LD: needsConsent=1（同意画面は出さない）
  LD->>LD: コース「やってみる」
  LD->>P: /consent?next=/start-program 等
```

**② 初回・正規「試してみる」→ 7日間**（**導線①**）

```mermaid
sequenceDiagram
  participant H as ホーム
  participant LD as /trial_4w/landing
  participant L as /login
  participant P as /post-login
  participant C as /consent
  participant S as /start-program

  H->>LD: 試してみる
  LD->>L: 7日間やってみる → next=/start-program
  L->>P: next=/start-program
  Note over P: consents 無し・コース選択済み
  P->>C: /consent?next=/start-program（ランディング再表示なし）
  C->>S: 同意後
```

**②b 既会員（同意済み・フリー）の誤操作「試してみる」→ 7日間**（**導線⑦**）

```mermaid
sequenceDiagram
  participant H as ホーム（ゲスト）
  participant LD as /trial_4w/landing
  participant L as /login
  participant P as /post-login
  participant S as /start-program

  H->>LD: 試してみる
  LD->>L: 7日間やってみる → next=/start-program
  L->>P: next=/start-program
  Note over P: consents あり・start7d 等
  P->>S: /start-program 直行（同意・ランディング再表示なし）
```

**②c 会員同意でキャンセル**（**導線③**／**導線⑥**）

```mermaid
sequenceDiagram
  participant C as /consent
  participant A as Firebase Auth
  participant LD as /trial_4w/landing

  C->>A: signOut（ログオフ）
  C->>LD: replace（ゲストとしてランディング）
  Note over LD: consents 未保存。Auth 未ログイン
```

**②d 初回・正規「試してみる」→ スタンダード（AIコーチ）**（**導線①・スタンダード**）

```mermaid
sequenceDiagram
  participant H as ホーム
  participant LD as /trial_4w/landing
  participant L as /login
  participant P as /post-login
  participant C as /consent
  participant A as /apply?plan=standard
  participant N as /trial_4w

  H->>LD: 試してみる
  LD->>L: AIコーチやってみる → next=/apply?plan=standard
  L->>P: next=/apply?plan=standard
  Note over P: consents 無し・コース選択済み
  P->>C: /consent?next=/apply?plan=standard
  C->>A: 同意後
  Note over A: 特定商取引法デモ情報・お客様情報入力
  A->>A: 申し込む（デモ）送信
  Note over A: applyDemoPlanEnrollment
  A->>N: replace（気づきノート）
```

**②e 初回・正規「試してみる」→ プレミアム**（**導線①・プレミアム**）

```mermaid
sequenceDiagram
  participant H as ホーム
  participant LD as /trial_4w/landing
  participant L as /login
  participant P as /post-login
  participant C as /consent
  participant A as /apply?plan=premium
  participant N as /trial_4w

  H->>LD: 試してみる
  LD->>L: プレミアム申し込む → next=/apply?plan=premium
  L->>P: next=/apply?plan=premium
  Note over P: consents 無し・コース選択済み
  P->>C: /consent?next=/apply?plan=premium
  C->>A: 同意後
  Note over A: 特定商取引法デモ情報・お客様情報入力
  A->>A: 申し込む（デモ）送信
  Note over A: applyDemoPlanEnrollment
  A->>N: replace（気づきノート）
```

**③ 再ログイン（同意済み・7日間 start7d）**（**導線⑧**）

```mermaid
sequenceDiagram
  participant H as ホーム（ゲスト）
  participant L as /login
  participant P as /post-login
  participant S as /start-program

  H->>L: ログインして続きから → next=/
  L->>P: next=/
  Note over P: consents あり, primaryCourse = start7d
  P->>S: /start-program
```

**③b 再ログイン（同意済み・気づきノート等）**

```mermaid
sequenceDiagram
  participant H as ホーム
  participant L as /login
  participant P as /post-login

  H->>L: next=/
  L->>P: next=/
  Note over P: consents あり, kizuki / STD / PRE
  P->>H: /
```

#### 実装ファイル対応

| 画面 | ファイル | 役割 |
|------|----------|------|
| `/login` | `src/app/login/page.tsx` | `next` を `normalizeAuthNext` → `/post-login?next=...` |
| `/post-login` | `src/app/post-login/page.tsx` | 上記フローチャートの分岐 |
| `/trial_4w/landing` | `src/app/trial_4w/landing/page.tsx` | `needsConsent=1` バナー、未同意 CTA→`/consent`。**戻る**（needsConsent 時）→ `signOut` → `/` |
| `/consent` | `src/app/consent/page.tsx` | 同意保存 → `next` へ。**キャンセル** → `signOut` → `/trial_4w/landing` |
| ホームバナー | `src/components/HomePage.tsx` | `RETURNING_LOGIN_HREF` = `/login?next=/` |
| 共通 | `src/lib/onboardingFlow.ts` | `normalizeAuthNext`, `isPreOnboardingUser`, `isFirstTimeOnboardingNext`, `CONSENT_CANCEL_LANDING`, `isLandingBackRequiresSignOut`, **`resolvePostLoginDestination`**, **`resolveOnboardingDestination`**（申込済み既会員の申込画面スキップ） |
| 意図的ログオフ | `src/lib/intentionalSignOut.ts` | `signOutAndRedirect`（先に画面遷移→signOut。ログオフ時の `/login` 誤リダイレクト防止） |
| コース判定 | `src/lib/enrollmentCourse.ts` | `hasAiCoachOrPremiumSignup`, `isStart7dOnly`, `consentNextImpliesKizuki` |
| 同意後 enrollment | `src/lib/firestore.ts` | `applyConsentCourseEnrollment`, `ensureKizukiTrialEndsAtIfNeeded` |

### 2.1.3 検証用フィールド一覧（表1・ランディング・同意）

手動テスト時に Firestore Console と画面表示を突合するための正本。**導線チェック前**は §2.1.3 D の初期化手順どおり `users/{uid}` 削除（または下表フィールドを個別クリア）すること。

#### A. Firestore `users/{uid}`

| フィールド | 型 | 取りうる値（例） | いつ設定される | 分岐・UI への effect |
|------------|-----|------------------|----------------|----------------------|
| `consents.termsVersion` | string | `2026-05-20` 等（`public/legal/terms.json` の `version`） | `/consent` で同意保存 | 現行版と一致 → 同意済み |
| `consents.privacyVersion` | string | 同上（`privacy.json`） | 同上 | 同上 |
| `consents.acceptedAt` | Timestamp | 同意日時 | 同上 | 同上 |
| `enrollment.primaryCourse` | string / 無し | **無し**＝未選択、`start7d`＝7日間、`kizuki`＝気づきノート | `start7d`: 同意 `next=/start-program` 保存時（**同意直後**）。`/start-program` 到達時も idempotent に再設定。`kizuki`: 同意 `next=/trial_4w` 時、または `?apply=ai_coach` | `start7d` → ランディング7日間「利用中」・AI「申し込む」・ノート nav 無効 |
| `subscription.plan` | string | `free` / `standard` / `premium` | 新規作成時 `free`（`createDefaultUserProfile`） | `standard`/`premium` → 気づきノート利用可 |
| `subscription.status` | string | `active`（テスト時はほぼこれ） | 新規作成時 | 有料プラン有効判定に使用 |
| `subscription.trialEndsAt` | Timestamp / 無し | **未来日**＝28日お試し中。**無し**＝お試しなし | 気づきノート同意（`next=/trial_4w`）または `?apply=ai_coach` 時に自動付与（+28日）。**7日間のみでは付与しない** | `free`＋`kizuki`＋未来日 → `hasAiCoachOrPremiumSignup` true → AI「利用中」 |
| `subscription.startDate` | Timestamp | 登録日 | 新規作成時 | 表示用 |
| `role` | string | `user` | 新規作成時 | 管理者以外 |

**表1（7日間）の望ましい中間状態**

| 段階 | `consents` | `primaryCourse` | `trialEndsAt` | ランディング AIコーチ CTA |
|------|------------|-----------------|---------------|---------------------------|
| ゲスト | 無し | 無し | 無し | やってみる |
| ログイン直後・未同意 | 無し | 無し | 無し | **やってみる**（利用中にしない） |
| 同意キャンセル後（ログオフ） | 無し | 無し | 無し | **やってみる**（ゲスト表示。`users/{uid}` は残る場合あり） |
| 7日間同意後・スタート到達前 | あり | `start7d` | 無し | 申し込む |
| 7日間利用中 | あり | `start7d` | 無し | 申し込む |
| AIコーチ利用中（別表） | あり | `kizuki` | 未来日 | 利用中 |

#### B. URL クエリ（画面遷移）

| パラメータ | 例 | 意味 |
|------------|-----|------|
| `login?next=` | `/`、`/start-program` | ログイン後の最終行先（`/login` が `post-login` にラップ） |
| `post-login?next=` | `/start-program` | 同意・ランディング戻しの分岐元 |
| `needsConsent` | `1` | ランディング案内バナー表示（ログイン済・未同意） |
| `consent?next=` | `/start-program`、`/trial_4w` | 同意後の遷移先＋**コース記録**（`start-program` なら `start7d`、`trial_4w` なら `kizuki`） |
| `apply` | `ai_coach` | 7日間利用中から AIコーチ申込（`/trial_4w?apply=ai_coach`） |

#### C. コード上の判定関数

| 関数 | true のとき（代表） |
|------|---------------------|
| `hasAcceptedCurrentConsents` | `consents` の版が `terms.json` / `privacy.json` と一致 |
| `isPreOnboardingUser` | `enrollment.primaryCourse` 未設定 |
| `isStart7dOnly` | `primaryCourse === 'start7d'` |
| `hasAiCoachOrPremiumSignup` | `plan` が STD/PRE、または `kizuki`＋`trialEndsAt` 未来 |
| `isKizukiNoteNavEnabled` | 上記と同じ（サイドバー「ノート」） |
| `shouldShowStart7dHomeHint` | `start7d` かつ気づき未申込 |

#### D. 導線チェック前の初期化（必須）

| 操作 | 理由 |
|------|------|
| `users/{uid}` ドキュメント削除 | クリーンな初回入会 |
| または `consents` 削除 ＋ `enrollment` 削除 ＋ `subscription.trialEndsAt` 削除 | AI 検証用 `trialEndsAt` が残ると AI「利用中」になる |
| ログアウト → ブラウザ再読込 | クライアントキャッシュクリア |

### 2.2 同意後の導線（文言）

URL 直書きではなく、次の **目的ベース** の表現を仕様表に用いる。実装時は下表の `next` にマッピングする。

| 目的 | 仕様表の表現 | 実装 `next`（代表） |
|------|--------------|---------------------|
| 7日間スタートプログラム | 会員同意→**スタートプログラム**へ | `/consent?next=/start-program` |
| 気づきノート（AI／STD） | 会員同意→**気づきノート**へ | `/consent?next=/trial_4w`（または `?apply=ai_coach`） |
| 気づきノート・プレミアム | 会員同意→**気づきノートのプレミアムコース**へ | 申込フロー確定後に URL 固定（Stripe 前） |

### 2.3 7日間スタートプログラムの表示

| 場所 | ゲスト | フリー会員 | STD／PRE |
|------|--------|------------|----------|
| **ホーム** | 7日間導線**非表示**（「試してみる」→ランディングのみ） | スタート／案内あり | 7日間行は**表示しない** |
| **ランディング** | **やってみる 有効** | **選択中**（7日間を選んだ定常状態） | **—** |

ゲスト（新規）も **ホーム「試してみる」→ ランディング** 経由で 7日間を選択できる。

### 2.4 28日お試し（気づきノート）

| 項目 | 内容 |
|------|------|
| **対象** | **スタンダード／プレミアム初回申込時のみ** |
| **期間** | 28日（JST）。`trialEndsAt` |
| **再付与** | **なし**（`trialConsumedAt`） |
| **期間中** | standard 相当の気づきノート |
| **コース変更画面** | 選択中コースに **（お試し付き）** と表示可 |

### 2.5 メッセージボード（プレミアム→下位コース）

| 項目 | 内容 |
|------|------|
| **即時** | 新規投稿・編集**不可** |
| **履歴** | **閲覧可**（入力 UI は無効または案内） |
| **データ** | `dataRetentionEndsAt` まで保持し **90日後削除** |

表11（PRE→フリー）、表12（PRE→STD）の備考に明記。

### 2.6 マイページ（本バージョン）

| 項目 | 内容 |
|------|------|
| **サイドバー** | **リンクなし**（全コース **無効**） |
| **直アクセス** | `/mypage` は**許可**（仕様詰め前の既存画面） |

### 2.7 コース変更画面・申込フォーム

| 項目 | 内容 |
|------|------|
| **スコープ** | **新規画面**。Stripe 接続**前**に画面イメージを確定し実装 |
| **コース変更** | `/courses/change`（コース変更・選択画面・デモ） |
| **申込フォーム** | `/apply?plan=standard\|premium`（仮画面・デモクラティック情報） |

---

## 3. コース別の使用可能機能一覧（定常状態）

ログイン状態・プランが安定しているときの UI。遷移表（§5）の「変化後」列と整合させる。

### 3.1 定常状態チェック一覧

実装後の画面確認用。**OK** 欄にチェック（`OK` / 日付 / 担当者など）を記入する。

※フリー会員で `enrollment.primaryCourse = start7d` のとき、サイドバー「ノート」は **無効**（§4）。

| # | UI（画面など） | コンポーネント | ゲスト | フリー | スタンダード | プレミアム | OK |
|---|----------------|----------------|--------|--------|--------------|------------|-----|
| 1 | ヘッダ | — | ゲストアイコンのみ | ログインユーザアイコン | 同左 | 同左 |  |
| 2 | サイドバー | ホーム | 有効 | 有効 | 有効 | 有効 |  |
| 3 | サイドバー | スタート | 無効 | 有効 | 有効 | 有効 |  |
| 4 | サイドバー | ノート | 無効 | 無効 | 有効 | 有効 |  |
| 5 | サイドバー | コミュニケーション | 有効 | 有効 | 有効 | 有効 |  |
| 6 | サイドバー | マイページ | 無効 | 無効 | 無効 | 無効 |  |
| 7 | ホーム | バナー① | 試してみる | スタートから始める→スタート | 同左 | 同左 |  |
| 8 | ホーム | バナー② | ログインして続ける | 気づきノートを試す→ランディング | 気づきノートを続ける→ノート | 同左 |  |
| 9 | ホーム | マネジメント情報 | 無効（メッセージ） | 無効（メッセージ） | 有効 | 有効 |  |
| 10 | スタート画面 | 「気づきノート」ボタン | — | 気づきノートを試す→ランディング | 気づきノートへ | 同左 |  |
| 11 | ノート画面 | 行動宣言 | 無効 | 無効 | 有効 | 有効（共有あり） |  |
| 12 | ノート画面 | 朝・晩 | 無効 | 無効 | 有効 | 有効 |  |
| 13 | ノート画面 | 週 | 無効 | 無効 | 有効 | 有効（共有あり） |  |
| 14 | ノート画面 | 月 | 無効 | 無効 | 有効 | 有効（共有あり） |  |
| 15 | コミュニケーション | 館長から | 有効 | 有効 | 有効 | 有効 |  |
| 16 | コミュニケーション | メッセージボード | 無効 | 無効 | 無効 | 有効 |  |
| 17 | ログインパネル | ユーザIDセレクト | 有効 | — | — | — |  |
| 18 | ランディング | 7日間スタートプログラム | やってみる 有効 | 選択中 | — | — |  |
| 19 | ランディング | 気づきノート AIコーチ | やってみる 有効 | やってみる 有効 | 選択中 | — |  |
| 20 | ランディング | 気づきノート パーソナルコーチ | やってみる 有効 | やってみる 有効 | やってみる 有効 | 選択中 |  |
| 21 | コース変更 | フリーコース | — | — | 選択（90日保存メッセージ） | 選択（同上） |  |
| 22 | コース変更 | スタンダードコース | — | — | 選択中（お試し付き） | 選択（同上） |  |
| 23 | コース変更 | プレミアムコース | — | — | 選択→会員同意→プレミアムコースへ | 選択中（お試し付き） |  |
| 24 | 会員同意 | 利用規約・プライバシー | ランディングの次に表示 | 同左 | 同左 | 同左 |  |
| 25 | 申込フォーム | 入力欄 | — | — | 同意画面の後 | 同意画面の後 |  |

- コミュニケーション（サイドバー）: ゲスト・フリーは **館長からのみ**（メッセージボードタブは出さない）。
- マネジメント無効時メッセージ例:「試してみる」から気づきノートを選択すると有効になります。
- 初回入会: ランディング → 会員同意 →（有料なら）申込フォーム（`/apply?plan=...`）。
- コース変更: `/courses/change`（ログイン済み・全プラン。3列＋機能表）。

---

---

## 4. plan × `enrollment.primaryCourse` 補足

遷移表は `plan` 中心。実装（`src/lib/enrollmentCourse.ts`）では **`primaryCourse`** もノート可否に effect する。

| `plan` | `primaryCourse` | サイドバー「ノート」 | ホームバナー（代表） |
|--------|-----------------|----------------------|----------------------|
| `free` | `start7d` | **無効** | 7日間案内文（スタートへ）。「気づきノートを続ける」**出さない** |
| `free` | `kizuki` ＋ `trialEndsAt` 未来 | 有効 | 「気づきノートを続ける」 |
| `free` | 未設定 または `start7d` | **無効** | 7日間案内 or 「気づきノートを試す」 |
| `standard` / `premium` | 任意 | 有効 | 「気づきノートを続ける」 |
| ゲスト | — | 無効 | 試してみる／ログインして続きから |

- `start7d` は `/start-program` 到達時に設定。`kizuki` へは**昇格のみ**（降格しない）。
- 7日間のみユーザーが AIコーチ「やってみる」→ `?apply=ai_coach` でノート導線を開く。

---

## 5. 状態遷移チェック一覧

**2026-06-14 以降**: ゲスト起点の入会は **画面遷移（導線フロー）** ＋ **導線チェックリスト** で確認する（§1.1）。**会員種別間**（ログアウト・アップグレード等）は §5.3 以降を順次同形式へ移行する。

| § | 旧表 | 内容 | 状態 |
|---|------|------|------|
| §5.0 | 表1 | ゲスト → フリー（7日間） | **導線フローへ差し替え済** |
| §5.1 | 表2 | ゲスト → スタンダード（AIコーチ） | **導線フローへ差し替え済** |
| §5.2 | 表3 | ゲスト → プレミアム（パーソナルコーチ） | **導線フローへ差し替え済** |
| §5.3 | 表4 | フリー → ゲスト（ログアウト） | **導線フローへ差し替え済** |
| §5.4 | 表5 | フリー → スタンダード（アップグレード） | **導線フローへ差し替え済** |
| §5.5 | 表6 | フリー → プレミアム（アップグレード） | **導線フローへ差し替え済** |
| §5.6〜 | 表7〜12 | その他会員種別間 | 旧 UI 項目別表（移行予定） |

**OK** 欄は導線チェックリストの **結果** 列に記入する（例: `OK` / 空欄＝未実施 / `NG: 理由`）。

### 5.0 画面遷移（導線フロー）_1　ゲスト→フリー会員

外部仕様の「**状態変化フロー_1　ゲスト→フリー会員**」。各**最終分岐**に **導線No**（①〜⑧）。

**初期条件**: ホーム画面アクセス時に非ログインの場合、**未会員** または **ログオフした既会員（フリーコース選択済み）** のどちらか。

```mermaid
flowchart TD
  START["ホーム画面アクセス"] --> LOGIN_CHK{"ログイン状態"}
  LOGIN_CHK -->|ログイン中| FREE_MODE["ホーム画面<br/>フリーモード"]
  LOGIN_CHK -->|非ログイン| GUEST["ホーム画面<br/>ゲストモード"]

  GUEST --> BANNER{"バナーボタン選択"}

  %% --- 経路A: 試してみる ---
  BANNER -->|試してみる| LAND_A["ランディングページ"]
  LAND_A --> BACK_A{"戻る"}
  BACK_A -->|Yes| GUEST2["ホーム画面_ゲストモード<br/>【導線②】"]
  BACK_A -->|No| COURSE_A["コース選択<br/>（7日間スタートプログラム）"]
  COURSE_A --> ACCT_A["アカウント選択画面"]
  ACCT_A --> AUTH_A["ログイン承認"]
  AUTH_A --> QUAL_A{"ユーザ資格判定"}
  QUAL_A -->|既会員| START_EXIST7["スタート画面<br/>【導線⑦】"]
  QUAL_A -->|未会員| CONSENT_A["会員同意画面"]
  CONSENT_A --> AGREE_A{"会員同意<br/>（同意 / キャンセル）"}
  AGREE_A -->|同意| FREE_ENROLL1["フリーコース資格取得"]
  FREE_ENROLL1 --> START_PG1["スタートページ<br/>【導線①】"]
  AGREE_A -->|キャンセル| LOGOFF_A["ログオフ"]
  LOGOFF_A --> LAND_A3["ランディングページ<br/>【導線③】"]

  %% --- 経路B: ログインして続ける ---
  BANNER -->|ログインして続ける| ACCT_B["アカウント選択画面"]
  ACCT_B --> AUTH_B["ログイン承認"]
  AUTH_B --> QUAL_B{"ユーザ資格判定"}
  QUAL_B -->|既会員| START_EXIST8["スタート画面<br/>【導線⑧】"]
  QUAL_B -->|未会員| LAND_B["ランディングページ"]
  LAND_B --> BACK_B{"戻る"}
  BACK_B -->|Yes| LOGOFF5["ログオフ"]
  LOGOFF5 --> GUEST5["ホーム画面_ゲストモード<br/>【導線⑤】"]
  BACK_B -->|No| COURSE_B["コース選択<br/>（7日間スタートプログラム）"]
  COURSE_B --> CONSENT_B["会員同意画面"]
  CONSENT_B --> AGREE_B{"会員同意<br/>（同意 / キャンセル）"}
  AGREE_B -->|同意| FREE_ENROLL4["フリーコース資格取得"]
  FREE_ENROLL4 --> START_PG4["スタートページ<br/>【導線④】"]
  AGREE_B -->|キャンセル| LOGOFF_B["ログオフ"]
  LOGOFF_B --> LAND_B6["ランディングページ<br/>【導線⑥】"]
```

#### 導線チェックリスト_1　ゲスト→フリー

**テスト実施日: 2026年6月14日**

| 導線No | シーケンス | 結果 | 備考 |
|--------|------------|------|------|
| 導線① | 試してみる → 7日間選択 → 同意画面 → 会員同意 → スタートページ | OK | |
| 導線② | 試してみる → ランディングページ表示 → 戻る → ホーム画面 | OK | |
| 導線③ | 試してみる → 7日間選択 → 同意画面 → キャンセル | OK | ログオフ → ランディング（ゲスト） |
| 導線④ | ログインして続ける → ログイン → ランディングページ → 7日間スタートプログラム選択 → 会員同意 → スタートプログラム | OK | |
| 導線⑤ | ログインして続ける → ログイン → ランディングページ → 戻る | OK | ログオフ → ゲストホーム |
| 導線⑥ | ログインして続ける → ログイン → ランディングページ → 7日間スタートプログラム選択 → 会員同意 → キャンセル | OK | ログオフ → ランディング（ゲスト） |
| 導線⑦ | 既会員（フリーコース選択ユーザ）: 試してみる → 7日間スタートプログラム選択 → アカウント選択画面 → スタート画面 | OK | |
| 導線⑧ | 既会員（フリーコース選択ユーザ）: ログインして続きから → アカウント選択画面 → ログイン → スタート画面 | OK | |

#### 実装 URL との対応（フリー・7日間）

| 外部仕様のノード | 実装（代表） |
|------------------|--------------|
| ホーム画面 ゲストモード | `/` |
| ホーム画面 フリーモード | `/`（ログイン済・同意済み） |
| 試してみる | `/trial_4w/landing` |
| ログインして続ける | `/login?next=/` → `/post-login?next=/` |
| ランディングページ | `/trial_4w/landing`（**試してみる経路では1回のみ**） |
| ランディング（誤操作ログイン後のみ） | `/trial_4w/landing?needsConsent=1` |
| ランディング「戻る」（needsConsent・ログイン中） | `signOut` → `/`（ゲストホーム） |
| アカウント選択画面 | `/login` |
| ログイン承認 | Google OAuth → `/post-login` |
| コース選択（7日間） | ランディングで7日間「やってみる」押下 |
| 会員同意画面 | `/consent?next=/start-program` 等 |
| 会員同意 キャンセル | `signOut` → `/trial_4w/landing`（`CONSENT_CANCEL_LANDING`） |
| ログオフ | Firebase Auth `signOut`（IndexedDB セッション削除） |
| フリーコース資格取得 | 同意保存時 `applyConsentCourseEnrollment` で `start7d`（`next=/start-program`）。`/start-program` 到達時も idempotent に再設定 |
| スタートページ / スタート画面 | `/start-program` |
| 既会員（同意済み）誤操作「試してみる」 | ログイン後 **`/start-program` 直行**（**導線⑦**） |
| 既会員「ログインして続きから」 | **`start7d` のみ** → **`/start-program`**（**導線⑧**）。気づきノート等 → `/` |
| 導線① | 試してみる → 7日間 → `/consent` → `/start-program` |
| 導線② | 試してみる → ランディング「戻る」→ `/`（ゲスト） |
| 導線③ | 試してみる経路の同意キャンセル → `signOut` → `/trial_4w/landing` |
| 導線④ | ログインして続ける → `needsConsent=1` ランディング → 7日間 → `/consent` → `/start-program` |
| 導線⑤ | `needsConsent=1` ランディング「戻る」→ `signOut` → `/` |
| 導線⑥ | ログインして続ける経路の同意キャンセル → `signOut` → `/trial_4w/landing` |

詳細な分岐条件・Firestore フィールドは §2.1.2・§2.1.3 を参照。


---

### 5.1 画面遷移（導線フロー）_2　ゲスト→スタンダード会員

外部仕様の「**状態変化フロー_2　ゲスト→スタンダード会員**」。各**最終分岐**に **導線No**（①〜⑧）。フリー（§5.0）と同型で、コース選択は **スタンダード（AIコーチ）**、**未会員の初回入会**は **会員同意 → デモ申込 → 気づきノート**（`/trial_4w`）の順。

**初期条件**: ホーム画面アクセス時に非ログインの場合、**未会員** または **ログオフした既会員（スタンダードコース選択済み）** のどちらか。

```mermaid
flowchart TD
  START["ホーム画面アクセス"] --> LOGIN_CHK{"ログイン状態"}
  LOGIN_CHK -->|ログイン中| STD_MODE["ホーム画面<br/>スタンダードモード"]
  LOGIN_CHK -->|非ログイン| GUEST["ホーム画面<br/>ゲストモード"]

  GUEST --> BANNER{"バナーボタン選択"}

  %% --- 経路A: 試してみる ---
  BANNER -->|試してみる| LAND_A["ランディングページ"]
  LAND_A --> BACK_A{"戻る"}
  BACK_A -->|Yes| GUEST2["ホーム画面_ゲストモード<br/>【導線②】"]
  BACK_A -->|No| COURSE_A["コース選択<br/>（スタンダードコース）"]
  COURSE_A --> ACCT_A["アカウント選択画面"]
  ACCT_A --> AUTH_A["ログイン承認"]
  AUTH_A --> QUAL_A{"ユーザ資格判定"}
  QUAL_A -->|既会員| NOTE_EXIST7["気づきノートページ<br/>【導線⑦】"]
  QUAL_A -->|未会員| CONSENT_A["会員同意画面"]
  CONSENT_A --> AGREE_A{"会員同意<br/>（同意 / キャンセル）"}
  AGREE_A -->|同意| APPLY_A["申込フォーム<br/>（特定商取引法デモ）"]
  APPLY_A --> APPLY_SUB_A["申し込む（デモ）送信"]
  APPLY_SUB_A --> STD_ENROLL1["スタンダードコース資格取得"]
  STD_ENROLL1 --> NOTE_PG1["気づきノートページ<br/>【導線①】"]
  AGREE_A -->|キャンセル| LOGOFF_A["ログオフ"]
  LOGOFF_A --> LAND_A3["ランディングページ<br/>【導線③】"]

  %% --- 経路B: ログインして続ける ---
  BANNER -->|ログインして続ける| ACCT_B["アカウント選択画面"]
  ACCT_B --> AUTH_B["ログイン承認"]
  AUTH_B --> QUAL_B{"ユーザ資格判定"}
  QUAL_B -->|既会員| NOTE_EXIST8["気づきノートページ<br/>【導線⑧】"]
  QUAL_B -->|未会員| LAND_B["ランディングページ"]
  LAND_B --> BACK_B{"戻る"}
  BACK_B -->|Yes| LOGOFF5["ログオフ"]
  LOGOFF5 --> GUEST5["ホーム画面_ゲストモード<br/>【導線⑤】"]
  BACK_B -->|No| COURSE_B["コース選択<br/>（スタンダードコース）"]
  COURSE_B --> CONSENT_B["会員同意画面"]
  CONSENT_B --> AGREE_B{"会員同意<br/>（同意 / キャンセル）"}
  AGREE_B -->|同意| APPLY_B["申込フォーム<br/>（特定商取引法デモ）"]
  APPLY_B --> APPLY_SUB_B["申し込む（デモ）送信"]
  APPLY_SUB_B --> STD_ENROLL4["スタンダードコース資格取得"]
  STD_ENROLL4 --> NOTE_PG4["気づきノートページ<br/>【導線④】"]
  AGREE_B -->|キャンセル| LOGOFF_B["ログオフ"]
  LOGOFF_B --> LAND_B6["ランディングページ<br/>【導線⑥】"]
```

#### 導線チェックリスト_2　ゲスト→スタンダード

| 導線No | シーケンス | 結果 | 備考 |
|:---:|:---|:---:|:---|
| 導線① | 試してみる → スタンダードコース選択 → 同意画面 → 会員同意 → **申込フォーム** → **申し込む（デモ）送信** → 気づきノートページ |OK | `/apply?plan=standard` |
| 導線② | 試してみる → ランディングページ表示 → 戻る → ホーム画面 |OK| |
| 導線③ | 試してみる → スタンダードコース選択 → 同意画面 → キャンセル → ログオフ → ランディング（ゲスト） |OK| 申込前 |
| 導線④ | ログインして続ける → ログイン → ランディングページ → スタンダードコース選択 → 会員同意 → **申込フォーム** → **申し込む（デモ）送信** → 気づきノートページ |OK| `/apply?plan=standard` |
| 導線⑤ | ログインして続ける → ログイン → ランディングページ → 戻る → ログオフ → ゲストホーム |OK| |
| 導線⑥ | ログインして続ける → ログイン → ランディングページ → スタンダードコース選択 → 会員同意 → キャンセル → ログオフ → ランディング（ゲスト） |OK| |
| 導線⑦ | 既会員（スタンダードコース選択ユーザ）: 試してみる → スタンダードコース → アカウント選択画面 → 気づきノートページ |OK| 申込済みのため **申込画面を表示せず** `/trial_4w` 直行（`resolveOnboardingDestination`） |
| 導線⑧ | 既会員（スタンダードコース選択ユーザ）: ログインして続きから → アカウント選択画面 → ログイン → 気づきノートページ |OK| 申込スキップ。`resolvePostLoginDestination` → `/trial_4w` |

**テスト初期条件（未会員）**: `users/{uid}` 削除、IndexedDB クリア（§2.1.3 D）。
#### 申込手順（デモ）　スタンダード

**対象導線**: ①・④（未会員・会員同意後）。既会員（⑦⑧）は申込をスキップして `/trial_4w` へ。

| # | 画面 | 操作 | 期待結果 | OK |
|---|------|------|----------|-----|
| A-1 | `/apply?plan=standard` | 販売事業者情報（デモ）を表示 | 事業者名・代表・所在地・連絡先が表示される | |
| A-2 | 同上 | お申し込み内容（料金・28日お試し）を確認 | 月額・年払い・特商法リンクが表示される | |
| A-3 | 同上 | お客様情報（名前・住所・電話）を入力 | 必須項目が入力できる | |
| A-4 | 同上 | 特定商取引法チェック → **申し込む（デモ）** | **`/trial_4w` へ自動遷移**（ランディングではない） | |
| A-5 | `/trial_4w` | 気づきノート本体 | タブ（行動宣言／朝・晩／週／月）が表示・操作可能 | |
| A-6 | Firestore（任意） | 送信直後 | `enrollment.primaryCourse=kizuki`、`subscription.plan=standard`、`trialEndsAt` 未来日 | |

#### 実装 URL との対応（スタンダード・AIコーチ）

| 外部仕様のノード | 実装（代表） |
|------------------|--------------|
| ホーム画面 スタンダードモード | `/`（ログイン済・同意済み・気づき利用可） |
| コース選択（スタンダード） | ランディングで AIコーチ「やってみる」押下 |
| 会員同意（初回） | `/consent?next=/apply?plan=standard` |
| スタンダードコース資格取得 | デモ申込送信時 `applyDemoPlanEnrollment`（`kizuki`＋`plan=standard`＋`subscription.features`＋`trialEndsAt` 等） |
| 申込フォーム | `/apply?plan=standard`（特定商取引法デモ情報表示） |
| 気づきノートページ | `/trial_4w` |
| 導線① | 試してみる → AIコーチ → `/consent?next=/apply?plan=standard` → 申込 → `/trial_4w` |
| 導線④ | `needsConsent=1` ランディング → AIコーチ → `/consent?next=/apply?plan=standard` → 申込 → `/trial_4w` |
| 導線⑦ | 既会員・`login?next=/apply?plan=standard` → `post-login` で申込済み判定 → **`/trial_4w` 直行**（申込画面は出さない） |
| 導線⑧ | 既会員・`login?next=/` → `resolvePostLoginDestination` → `/trial_4w` |

詳細な分岐条件・Firestore フィールドは §2.1.2・§2.1.3 を参照。キャンセル・戻る時のログオフは §5.0 と同じ実装（`signOutAndRedirect` 等）。

---

### 5.2 画面遷移（導線フロー）_3　ゲスト→プレミアム会員

外部仕様の「**状態変化フロー_3　ゲスト→プレミアム会員**」。各**最終分岐**に **導線No**（①〜⑧）。フリー（§5.0）・スタンダード（§5.1）と同型で、コース選択は **プレミアム（パーソナルコーチ）**、**未会員の初回入会**は **会員同意 → デモ申込 → 気づきノート（プレミアム）**（`/trial_4w`）の順。

**初期条件**: ホーム画面アクセス時に非ログインの場合、**未会員** または **ログオフした既会員（プレミアムコース選択済み）** のどちらか。

```mermaid
flowchart TD
  START["ホーム画面アクセス"] --> LOGIN_CHK{"ログイン状態"}
  LOGIN_CHK -->|ログイン中| PRE_MODE["ホーム画面<br/>プレミアムモード"]
  LOGIN_CHK -->|非ログイン| GUEST["ホーム画面<br/>ゲストモード"]

  GUEST --> BANNER{"バナーボタン選択"}

  %% --- 経路A: 試してみる ---
  BANNER -->|試してみる| LAND_A["ランディングページ"]
  LAND_A --> BACK_A{"戻る"}
  BACK_A -->|Yes| GUEST2["ホーム画面_ゲストモード<br/>【導線②】"]
  BACK_A -->|No| COURSE_A["コース選択<br/>（プレミアムコース）"]
  COURSE_A --> ACCT_A["アカウント選択画面"]
  ACCT_A --> AUTH_A["ログイン承認"]
  AUTH_A --> QUAL_A{"ユーザ資格判定"}
  QUAL_A -->|既会員| NOTE_EXIST7["気づきノートページ<br/>（プレミアム）<br/>【導線⑦】"]
  QUAL_A -->|未会員| CONSENT_A["会員同意画面"]
  CONSENT_A --> AGREE_A{"会員同意<br/>（同意 / キャンセル）"}
  AGREE_A -->|同意| APPLY_A["申込フォーム<br/>（特定商取引法デモ）"]
  APPLY_A --> APPLY_SUB_A["申し込む（デモ）送信"]
  APPLY_SUB_A --> PRE_ENROLL1["プレミアムコース資格取得"]
  PRE_ENROLL1 --> NOTE_PG1["気づきノートページ<br/>（プレミアム）<br/>【導線①】"]
  AGREE_A -->|キャンセル| LOGOFF_A["ログオフ"]
  LOGOFF_A --> LAND_A3["ランディングページ<br/>【導線③】"]

  %% --- 経路B: ログインして続ける ---
  BANNER -->|ログインして続ける| ACCT_B["アカウント選択画面"]
  ACCT_B --> AUTH_B["ログイン承認"]
  AUTH_B --> QUAL_B{"ユーザ資格判定"}
  QUAL_B -->|既会員| NOTE_EXIST8["気づきノートページ<br/>（プレミアム）<br/>【導線⑧】"]
  QUAL_B -->|未会員| LAND_B["ランディングページ"]
  LAND_B --> BACK_B{"戻る"}
  BACK_B -->|Yes| LOGOFF5["ログオフ"]
  LOGOFF5 --> GUEST5["ホーム画面_ゲストモード<br/>【導線⑤】"]
  BACK_B -->|No| COURSE_B["コース選択<br/>（プレミアムコース）"]
  COURSE_B --> CONSENT_B["会員同意画面"]
  CONSENT_B --> AGREE_B{"会員同意<br/>（同意 / キャンセル）"}
  AGREE_B -->|同意| APPLY_B["申込フォーム<br/>（特定商取引法デモ）"]
  APPLY_B --> APPLY_SUB_B["申し込む（デモ）送信"]
  APPLY_SUB_B --> PRE_ENROLL4["プレミアムコース資格取得"]
  PRE_ENROLL4 --> NOTE_PG4["気づきノートページ<br/>（プレミアム）<br/>【導線④】"]
  AGREE_B -->|キャンセル| LOGOFF_B["ログオフ"]
  LOGOFF_B --> LAND_B6["ランディングページ<br/>【導線⑥】"]
```

#### 導線チェックリスト_3　ゲスト→プレミアム

**テスト実施日: 2026年6月5日**（導線①〜⑧・申込手順 A-1〜A-7 **すべて OK**）

| 導線No | シーケンス | 結果 | 備考 |
|---|---|---|---|
| 導線① | 試してみる → プレミアムコース選択 → 同意画面 → 会員同意 → **申込フォーム** → **申し込む（デモ）送信** → 気づきノートページ |OK | `/apply?plan=premium` |
| 導線② | 試してみる → ランディングページ表示 → 戻る → ホーム画面 |OK| |
| 導線③ | 試してみる → プレミアムコース選択 → 同意画面 → キャンセル |OK| 申込前。ログオフ → ランディング（ゲスト） |
| 導線④ | ログインして続ける → ログイン → ランディングページ → プレミアムコース選択 → 会員同意 → **申込フォーム** → **申し込む（デモ）送信** → 気づきノート |OK| `/apply?plan=premium` |
| 導線⑤ | ログインして続ける → ログイン → ランディングページ → 戻る |OK| ログオフ → ゲストホーム |
| 導線⑥ | ログインして続ける → ログイン → ランディングページ → プレミアムコース選択 → 会員同意 → キャンセル |OK| ログオフ → ランディング（ゲスト） |
| 導線⑦ | 既会員（プレミアムコース選択ユーザ）: 試してみる → プレミアムコース → アカウント選択画面 → 気づきノートページ |OK| 申込済みのため **申込画面を表示せず** `/trial_4w` 直行 |
| 導線⑧ | 既会員（プレミアムコース選択ユーザ）: ログインして続きから → アカウント選択画面 → ログイン → 気づきノートページ |OK| 申込スキップ。`resolvePostLoginDestination` → `/trial_4w` |

**テスト初期条件（未会員）**: `users/{uid}` 削除、IndexedDB クリア（§2.1.3 D）。



#### 申込手順（デモ）　プレミアム

**対象導線**: ①・④（未会員・会員同意後）。既会員（⑦⑧）は申込をスキップして `/trial_4w` へ。

| # | 画面 | 操作 | 期待結果 | OK |
|---|------|------|----------|-----|
| A-1 | `/apply?plan=premium` | 販売事業者情報（デモ）を表示 | 事業者名・代表・所在地・連絡先が表示される | OK |
| A-2 | 同上 | お申し込み内容（料金・28日お試し・セッション）を確認 | 月額・特商法リンクが表示される | OK |
| A-3 | 同上 | お客様情報（名前・住所・電話）を入力 | 必須項目が入力できる | OK |
| A-4 | 同上 | 特定商取引法チェック → **申し込む（デモ）** | **`/trial_4w` へ自動遷移**（ランディングではない） | OK |
| A-5 | `/trial_4w` | 気づきノート本体（プレミアム） | タブ表示・操作可能 | OK |
| A-5a | `/trial_4w` → **月** タブ | **コーチ共有** チェック | 有効（見出し右上。`subscription.features.coachComments=true` または `plan=premium`） | OK |
| A-5b | `/trial_4w` → **週** タブ | **コーチ共有** チェック | 有効（見出し右上。閲覧共有のみ。質問・回答は月タブ） | OK |
| A-5c | `/trial_4w` → **行動宣言** タブ | **コーチ共有** チェック | **発行済みテーマを「表示」選択後**にタイトルバーへ表示（プレミアムのみ） | OK |
| A-5d | `/communication` | メッセージボード | プレミアムでタブ有効（`resolveEntitlements`） | OK |
| A-6 | Firestore（任意） | 送信直後 | `enrollment.primaryCourse=kizuki`、`subscription.plan=premium`、`subscription.features.coachComments=true`、`trialEndsAt` 未来日 | OK |
| A-7 | Firestore（任意） | **週**タブで共有 ON 後 | `users/{uid}/journal_weekly/{weekStartKey}.sharedWithCoach=true` | OK |

#### 実装 URL との対応（プレミアム・パーソナルコーチ）

| 外部仕様のノード | 実装（代表） |
|------------------|--------------|
| ホーム画面 プレミアムモード | `/`（ログイン済・同意済み・`plan=premium`） |
| コース選択（プレミアム） | ランディングでパーソナルコーチ「**申し込む**」押下 |
| 会員同意（初回） | `/consent?next=/apply?plan=premium` |
| プレミアムコース資格取得 | デモ申込送信時 `applyDemoPlanEnrollment`（`kizuki`＋`plan=premium`＋**`subscription.features`（`coachComments` 等）**＋`trialEndsAt` 等） |
| 申込フォーム | `/apply?plan=premium` |
| 気づきノートページ（プレミアム） | `/trial_4w`（`plan=premium` で MB 等が有効） |
| 導線① | 試してみる → 申し込む → `/consent?next=/apply?plan=premium` → 申込 → `/trial_4w` |
| 導線④ | `needsConsent=1` ランディング → 申し込む → `/consent?next=/apply?plan=premium` → 申込 → `/trial_4w` |
| 導線⑦ | 既会員・`login?next=/apply?plan=premium` → `post-login` で申込済み判定 → **`/trial_4w` 直行**（申込画面は出さない） |
| 導線⑧ | 既会員・`login?next=/` → `resolvePostLoginDestination` → `/trial_4w`（`plan=premium` / `hasAiCoachOrPremiumSignup`） |

詳細な分岐条件・Firestore フィールドは §2.1.2・§2.1.3 を参照。キャンセル・戻る時のログオフは §5.0 と同じ実装（`signOutAndRedirect` 等）。

---

### 5.3 画面遷移（導線フロー）_4　フリー会員→ゲスト

外部仕様の「**状態変化フロー_4　フリー会員→ゲスト**」。各**最終到達**に **導線No**（①〜③）。いずれも **ログオフ後はゲストのホーム画面**（`/`）へ遷移する。

**初期条件**: **フリーコース選択済み**の既会員（`enrollment.primaryCourse=start7d`、`subscription.plan=free`、会員同意済み）。**ログオフ**はヘッダーの**ログインアイコン**（アバター）→ メニューから行う（`signOutAndRedirect` → `/`）。

```mermaid
flowchart TD
  subgraph R1["経路① ホーム"]
    HOME_FREE["ホーム画面<br/>フリーモード"] --> ICON1["ログインアイコン選択"]
    ICON1 --> LOGOFF1["ログオフ"]
    LOGOFF1 --> GUEST1["ホーム画面_ゲスト画面<br/>【導線①】"]
  end

  subgraph R2["経路② スタート"]
    START_PG["スタートページ"] --> ICON2["ログインアイコン選択"]
    ICON2 --> LOGOFF2["ログオフ"]
    LOGOFF2 --> GUEST2["ホーム画面_ゲスト画面<br/>【導線②】"]
  end

  subgraph R3["経路③ コミュニケーション"]
    COMM_PG["コミュニケーションページ"] --> ICON3["ログインアイコン選択"]
    ICON3 --> LOGOFF3["ログオフ"]
    LOGOFF3 --> GUEST3["ホーム画面_ゲスト画面<br/>【導線③】"]
  end
```

#### 導線チェックリスト_4　フリー会員→ゲスト

| 導線No | シーケンス | 結果 | 備考 |
|---|---|---|---|
| 導線① | ホーム画面 → ログインアイコン → ログオフ → ホーム画面（ゲスト） |OK| `/` フリーモードから。遷移先は **`/`**（ランディングではない） |
| 導線② | スタートページ → ログインアイコン → ログオフ → ホーム画面（ゲスト） |OK| `/start-program` から |
| 導線③ | コミュニケーションページ → ログインアイコン → ログオフ → ホーム画面（ゲスト） |OK| `/communication` から |

**テスト初期条件**: 導線チェックリスト_1 完了済みの **start7d のみ** UID（`plan=free`、`consents` 済み）。IndexedDB にセッションが残っている場合はログアウト後にゲスト表示を確認。

#### ログオフ後の UI 確認（代表）

| 項目 | ゲスト（`/`）での期待 |
|------|----------------------|
| ヘッダー | 人型アイコンのみ（**クリック不可**。ログインリンクなし） |
| ホーム バナー① | 「試してみる」→ `/trial_4w/landing` |
| ホーム バナー② | 「ログインして続きから」 |
| サイドバー「スタート」 | **無効** |
| サイドバー「ノート」 | **無効** |
| Firestore `users/{uid}` | **削除されない**（次回ログインで同一 UID・会員状態を復元） |

#### 実装 URL との対応（フリー → ゲスト）

| 外部仕様のノード | 実装（代表） |
|------------------|--------------|
| ホーム画面 フリーモード | `/`（ログイン済・`start7d` のみ・`plan=free`） |
| スタートページ | `/start-program` |
| コミュニケーションページ | `/communication` |
| ログインアイコン選択 | ヘッダーアバター → メニュー |
| ログオフ | `signOutAndRedirect(signOut, router, '/')`（`ProtoHeader`） |
| ホーム画面 ゲスト画面 | `/`（未ログイン） |
| 導線① | `/` → ログアウト → `/` |
| 導線② | `/start-program` → ログアウト → `/` |
| 導線③ | `/communication` → ログアウト → `/` |

**注意**: 同意キャンセル等の **意図的ログオフ**（`CONSENT_CANCEL_LANDING` → `/trial_4w/landing`）とは別経路。本 §5.3 は **通常のヘッダーログアウト** のみ。

---

### 5.4 画面遷移（導線フロー）_5　フリー会員→スタンダード会員

外部仕様の「**状態変化フロー_5　フリー会員→スタンダード会員**」。各**最終到達**に **導線No**（①〜③）。

**初期条件**: **フリー会員**（`enrollment.primaryCourse=start7d`、`subscription.plan=free`、**会員同意済み**）。**導線①**は起点 **ホーム／スタート／コミュニケーション** のいずれかからヘッダー**ログインアイコン** → **コース変更**。**導線③**は **スタートページ**（`/start-program`）から。**アップグレード時は再同意なし**（§2.1）。

```mermaid
flowchart TD
  HOME["ホーム画面"] --> ICON["ログインアイコン選択"]
  START["スタートページ"] --> ICON
  COMM["コミュニケーションページ"] --> ICON

  START --> UPGRADE["気づきノートへアップグレード"]
  UPGRADE --> LAND["ランディングページ"]
  LAND --> AI_CTA["AIコーチ 申し込む"]
  AI_CTA --> APPLY3["申込フォーム表示"]
  APPLY3 --> DEMO_IN3["デモクラティック情報入力"]
  DEMO_IN3 --> DEMO_OK3["デモクラティック情報確認"]
  DEMO_OK3 --> ENROLL3["スタンダードコース資格取得"]
  ENROLL3 --> NOTE3["気づきノートページ<br/>【導線③】"]

  ICON --> CHANGE["コース変更画面"]
  CHANGE --> SEL{"コース選択"}

  SEL -->|Yes| STD["スタンダードコース選択"]
  STD --> APPLY["申込フォーム表示"]
  APPLY --> DEMO_IN["デモクラティック情報入力"]
  DEMO_IN --> DEMO_OK["デモクラティック情報確認"]
  DEMO_OK --> ENROLL["スタンダードコース資格取得"]
  ENROLL --> NOTE["気づきノートページ<br/>【導線①】"]

  SEL -->|No| BACK["戻る"]
  BACK --> HOME_KEEP["ホーム画面<br/>（フリーモード）<br/>【導線②】"]
```

#### スタート画面からのアップグレード（UI）

| 項目 | 内容 |
|------|------|
| 表示条件 | `enrollment.primaryCourse=start7d` かつ `subscription.plan=free` |
| リード文 | 自分を変える気づきノートにトライをしてみる → |
| CTA | **気づきノートへアップグレード** → `/trial_4w/landing` |
| ランディング（`start7d` 利用中） | 7日間＝**利用中**、AIコーチ＝**申し込む** → `/apply?plan=standard` |
| 実装 | `src/app/start-program/page.tsx`、`src/app/trial_4w/landing/page.tsx` |

#### コース変更・選択画面（UI）

| 項目 | 内容 |
|------|------|
| 画面タイトル | **コース変更・選択画面** |
| URL | `/courses/change` |
| 3プラン列 | フリー／スタンダード／プレミアム（**オープン期間限定価格**・28日トライアル等はランディング同型） |
| 現プラン | **選択中**（お試し中は「選択中（お試し付き）」） |
| 他プラン | **選択する** → 申込（STD/PRE）またはダウングレード確認（デモ） |
| 下部 | 機能・サービス一覧表（○／—） |
| 右上 **戻る**（ランディング同型ボタン） | 導線②: **`/` へ遷移・ログイン維持**（ログオフしない） |

**実装**: `CourseChangePanel` ＋ `courseSelectionCatalog.ts`

#### 導線チェックリスト_5　フリー会員→スタンダード

| 導線No | シーケンス | 結果 | 備考 |
|:---:|:---|:---:|:---|
| 導線① | ログインアイコン → コース変更・選択画面 → スタンダード **選択する** → 申込フォーム → スタンダード資格取得 → 気づきノート |OK | **会員同意は経由しない**。起点は `/`・`/start-program`・`/communication` いずれも可 |
| 導線② | ログインアイコン → コース変更・選択画面 → **戻る** → ホーム（**ログイン維持**） |OK | **`signOut` しない**。フリーモードのまま `/` |
| 導線③ | スタートページ → **気づきノートへアップグレード** → ランディング → AIコーチ **申し込む** → 申込フォーム → スタンダード資格取得 → 気づきノート |OK | **コース変更を経由しない**。**会員同意スキップ**（7日間同意済み） |

**テスト初期条件**（§5.4 フリー会員）:

| フィールド | 期待値 | 備考 |
|------------|--------|------|
| `subscription.plan` | `free` | |
| `enrollment.primaryCourse` | `start7d` | 7日間会員同意（`next=/start-program`）保存時に設定。**修正前データ**で無い場合は `/start-program` を1回開くか、7日間導線①を再実施 |
| `consents` | 同意済み | |

**今回の確認（修正前）**: ② `primaryCourse` が無かった → **仕様上 NG**（7日間フリー会員の望ましい初期値ではない）。§5.4 導線自体は `primaryCourse` 無しでも動作した。

**変更後のデータ内容(firestore):**
- スタンダード会員変更後;
subscription.plan = standard
enrollment.primaryCourse = kizuki
consents = 同意済み


#### 申込手順（デモ）　フリー→スタンダード（アップグレード）

**対象導線**: **①**（コース変更経由）・**③**（スタート画面経由）。同意済みのため `/consent` は**スキップ**。

| # | 画面 | 操作 | 期待結果 | OK |
|---|------|------|----------|-----|
| B-1 | `/courses/change` | スタンダード「**選択する**」 | `/apply?plan=standard` へ | |
| B-2 | `/apply?plan=standard` | デモ事業者情報・料金を確認 | 表示される | |
| B-3 | 同上 | お客様情報入力・特商法チェック → **申し込む（デモ）** | **`/trial_4w` へ自動遷移** | |
| B-4 | `/trial_4w` | 気づきノート本体 | タブ操作可能。サイドバー「ノート」有効 | |
| B-5 | Firestore（任意） | 送信直後 | `plan=standard`、`enrollment.primaryCourse=kizuki`、`trialEndsAt` 未来日 | |

**導線③専用（B の代わりに C 列で確認可）**

| # | 画面 | 操作 | 期待結果 | OK |
|---|------|------|----------|-----|
| C-1 | `/start-program` | **気づきノートへアップグレード** | `/trial_4w/landing` へ | |
| C-2 | `/trial_4w/landing` | 7日間＝**利用中**、AIコーチ **申し込む** | `/apply?plan=standard` へ（**`/consent` なし**） | |
| C-3〜C-5 | 同上 | B-2〜B-5 と同様 | B-2〜B-5 と同期待 | |

#### アップグレード後の UI 確認（代表）

| 項目 | スタンダード到達後の期待 |
|------|--------------------------|
| サイドバー「ノート」 | **有効** → `/trial_4w` |
| ホーム バナー② | 「**気づきノートを続ける**」→ `/trial_4w` |
| コース変更画面 | スタンダード列 **選択中（お試し付き）** |
| コミュニケーション MB | **無効**（プレミアムのみ） |

#### 実装 URL との対応（フリー → スタンダード）

| 外部仕様のノード | 実装（代表） |
|------------------|--------------|
| スタートページ → アップグレード | `/start-program`「**気づきノートへアップグレード**」→ `/trial_4w/landing` |
| ランディング（`start7d`） | 7日間＝利用中、AIコーチ **申し込む** → `/apply?plan=standard` |
| ログインアイコン → コース変更 | ヘッダーアバター → 「コース変更」→ `/courses/change` |
| スタンダードコース選択 | `CourseChangePanel`「**選択する**」→ `/apply?plan=standard` |
| 申込フォーム | `/apply?plan=standard` — `ApplyFormPanel` → `applyDemoPlanEnrollment` |
| スタンダード資格取得 | 申込送信時 `kizuki`＋`plan=standard`＋`features`＋`trialEndsAt` |
| 気づきノートページ | `/trial_4w` |
| 導線① | `/courses/change` → 申込 → `/trial_4w`（**同意スキップ**） |
| 導線② | `/courses/change` → **戻る** → `/`（**ログイン維持**） |
| 導線③ | `/start-program` → ランディング → 申込 → `/trial_4w`（**同意スキップ**） |

**外部仕様フロー図との差**: 初期版フロー図は導線②を「戻る→ログオフ→ゲスト」としていたが、**実装・運用上は「戻る」→ `/`（ログイン維持）** を正とする（2026-06-05 確定）。

---

### 5.5 画面遷移（導線フロー）_6　フリー会員→プレミアム会員

外部仕様の「**状態変化フロー_6　フリー会員→プレミアム会員**」。各**最終到達**に **導線No**（①〜③）。

**初期条件**: **フリー会員**（`enrollment.primaryCourse=start7d`、`subscription.plan=free`、**会員同意済み**）。起点は **ホーム／スタート／コミュニケーション** のいずれか。**導線①**はヘッダー**ログインアイコン** → **コース変更**。**導線③**は **スタートページ**（`/start-program`）から（外部フロー図はホーム起点も示すが、`start7d` 利用中のホームは §4 のとおり **7日間スタート案内** が主）。**アップグレード時は再同意なし**（§2.1）。

```mermaid
flowchart TD
  HOME["ホーム画面"] --> ICON["ログインアイコン選択"]
  START["スタートページ"] --> ICON
  COMM["コミュニケーションページ"] --> ICON

  START --> UPGRADE["気づきノートへアップグレード"]
  UPGRADE --> LAND["ランディングページ"]
  LAND --> PRE_CTA["プレミアムコース 申し込む"]
  PRE_CTA --> APPLY3["申込フォーム表示"]
  APPLY3 --> DEMO_IN3["デモクラティック情報入力"]
  DEMO_IN3 --> DEMO_OK3["デモクラティック情報確認"]
  DEMO_OK3 --> ENROLL3["プレミアムコース資格取得"]
  ENROLL3 --> NOTE3["気づきノートページ<br/>（プレミアム）<br/>【導線③】"]

  ICON --> CHANGE["コース変更画面"]
  CHANGE --> SEL{"コース選択"}

  SEL -->|Yes| PRE["プレミアムコース選択"]
  PRE --> APPLY["申込フォーム表示"]
  APPLY --> DEMO_IN["デモクラティック情報入力"]
  DEMO_IN --> DEMO_OK["デモクラティック情報確認"]
  DEMO_OK --> ENROLL["プレミアムコース資格取得"]
  ENROLL --> NOTE["気づきノートページ<br/>（プレミアム）<br/>【導線①】"]

  SEL -->|No| BACK["戻る"]
  BACK --> HOME_GUEST["ホーム画面_ゲスト<br/>【導線②】"]
```

#### スタート画面からのアップグレード（UI）

| 項目 | 内容 |
|------|------|
| 表示条件 | `enrollment.primaryCourse=start7d` かつ `subscription.plan=free` |
| CTA | **気づきノートへアップグレード** → `/trial_4w/landing` |
| ランディング（`start7d` 利用中） | 7日間＝**利用中**、パーソナルコーチ＝**申し込む** → `/apply?plan=premium` |
| 実装 | `src/app/start-program/page.tsx`、`src/app/trial_4w/landing/page.tsx`（`renderPremiumCta`） |

#### コース変更・選択画面（UI）

§5.4 と同型（`/courses/change`）。プレミアム列 **選択する** → `/apply?plan=premium`。

#### 導線チェックリスト_6　フリー会員→プレミアム

| 導線No | シーケンス | 結果 | 備考 |
|:---:|:---|:---:|:---|
| 導線① | ログインアイコン → コース変更・選択画面 → プレミアム **選択する** → 申込フォーム → プレミアム資格取得 → 気づきノート |OK| **会員同意は経由しない**。起点は `/`・`/start-program`・`/communication` いずれも可 |
| 導線② | ログインアイコン → コース変更・選択画面 → **戻る** → ホーム画面_ゲスト |OK| 外部フロー図表記。**実装は §5.4 導線②と同型**（`/courses/change`「戻る」→ `/`、**ログイン維持**・`signOut` しない） |
| 導線③ | スタートページ → **気づきノートへアップグレード** → ランディング → プレミアム **申し込む** → 申込フォーム → プレミアム資格取得 → 気づきノート |OK| **コース変更を経由しない**。**会員同意スキップ**（7日間同意済み） |

**テスト初期条件**（§5.5 フリー会員）: §5.4 と同型（`plan=free`、`primaryCourse=start7d`、`consents` 同意済み）。

**変更後のデータ内容（Firestore・代表）**

| フィールド | 期待値 |
|------------|--------|
| `subscription.plan` | `premium` |
| `enrollment.primaryCourse` | `kizuki` |
| `subscription.features.coachComments` 等 | プレミアム相当（`featuresForPlan('premium')`） |
| `subscription.trialEndsAt` | 未来日（未設定時 +28日） |
| `consents` | 同意済み（再同意なし） |

#### 申込手順（デモ）　フリー→プレミアム（アップグレード）

**対象導線**: **①**（コース変更経由）・**③**（スタート画面経由）。同意済みのため `/consent` は**スキップ**。

| # | 画面 | 操作 | 期待結果 | OK |
|---|------|------|----------|-----|
| D-1 | `/courses/change` | プレミアム「**選択する**」 | `/apply?plan=premium` へ | |
| D-2 | `/apply?plan=premium` | デモ事業者情報・料金を確認 | 表示される | |
| D-3 | 同上 | お客様情報入力・特商法チェック → **申し込む（デモ）** | **`/trial_4w` へ自動遷移** | |
| D-4 | `/trial_4w` | 気づきノート本体（プレミアム） | タブ操作可能。サイドバー「ノート」有効 | |
| D-5 | `/communication` | メッセージボード | **有効**（プレミアムのみ） | |
| D-6 | Firestore（任意） | 送信直後 | `plan=premium`、`primaryCourse=kizuki`、`features` 更新、`trialEndsAt` 未来日 | |

**導線③専用（D の代わりに E 列で確認可）**

| # | 画面 | 操作 | 期待結果 | OK |
|---|------|------|----------|-----|
| E-1 | `/start-program` | **気づきノートへアップグレード** | `/trial_4w/landing` へ | |
| E-2 | `/trial_4w/landing` | 7日間＝**利用中**、パーソナルコーチ **申し込む** | `/apply?plan=premium` へ（**`/consent` なし**） | |
| E-3〜E-6 | 同上 | D-2〜D-6 と同様 | D-2〜D-6 と同期待 | |

#### アップグレード後の UI 確認（代表）

| 項目 | プレミアム到達後の期待 |
|------|------------------------|
| サイドバー「ノート」 | **有効** → `/trial_4w` |
| ホーム バナー② | 「**気づきノートを続ける**」→ `/trial_4w` |
| コース変更画面 | プレミアム列 **選択中（お試し付き）** |
| コミュニケーション MB | **有効** |
| ノート 週・月・行動宣言 | **コーチと共有** 有効 |

#### 実装 URL との対応（フリー → プレミアム）

| 外部仕様のノード | 実装（代表） |
|------------------|--------------|
| スタートページ → アップグレード | `/start-program`「**気づきノートへアップグレード**」→ `/trial_4w/landing` |
| ランディング（`start7d`） | 7日間＝利用中、パーソナルコーチ **申し込む** → `/apply?plan=premium` |
| ログインアイコン → コース変更 | ヘッダーアバター → 「コース変更」→ `/courses/change` |
| プレミアムコース選択 | `CourseChangePanel`「**選択する**」→ `/apply?plan=premium` |
| 申込フォーム | `/apply?plan=premium` — `ApplyFormPanel` → `applyDemoPlanEnrollment` |
| プレミアム資格取得 | 申込送信時 `kizuki`＋`plan=premium`＋`features`＋`trialEndsAt` |
| 気づきノートページ | `/trial_4w` |
| 導線① | `/courses/change` → 申込 → `/trial_4w`（**同意スキップ**） |
| 導線② | 外部図: 戻る → ゲスト。**実装**: `/courses/change` → **戻る** → `/`（**ログイン維持**） |
| 導線③ | `/start-program` → ランディング → 申込 → `/trial_4w`（**同意スキップ**） |

**外部仕様フロー図との差**: 導線②はフロー図上「ホーム画面_ゲスト」だが、**§5.4 と同様**コース変更画面の「戻る」は **`signOut` せず `/` へ**（2026-06-05 確定）。

---

### 表6 — フリー → プレミアム（コースアップグレード）— UI 項目別（参照）

§5.5 の導線フロー・チェックリストで E2E を確認する。以下は定常 UI の項目別差分（旧表6・移行保留）。

| # | UI（画面など） | コンポーネント | フリー（変化前） | プレミアム（変化後） | 備考 | OK |
|---|----------------|----------------|-------------|-------------|------|-----|
| 1 | ヘッダ | — | ログインユーザアイコン | ログインユーザアイコン |  |  |
| 2 | サイドバー | ホーム | 有効 | 有効 |  |  |
| 3 | サイドバー | スタート | 有効 | 有効 |  |  |
| 4 | サイドバー | ノート | 無効 | 有効 |  |  |
| 5 | サイドバー | コミュニケーション | 有効 | 有効 |  |  |
| 6 | サイドバー | マイページ | 無効 | 無効 |  |  |
| 7 | ホーム | バナー① | スタートから始める→スタート | 同左 |  |  |
| 8 | ホーム | バナー② | 気づきノートを試す→ランディング | 気づきノートを続ける→ノート |  |  |
| 9 | ホーム | マネジメント情報 | 無効（メッセージ） | 有効 |  |  |
| 10 | スタート画面 | 「気づきノート」ボタン | 有効（試す→ランディング） | 有効（気づきへ） |  |  |
| 11 | ノート画面 | 行動宣言 | 無効 | 有効（共有あり） |  |  |
| 12 | ノート画面 | 朝・晩 | 無効 | 有効 |  |  |
| 13 | ノート画面 | 週 | 無効 | 有効（共有あり） |  |  |
| 14 | ノート画面 | 月 | 無効 | 有効（共有あり） |  |  |
| 15 | コミュニケーション | 館長から | 有効 | 有効 |  |  |
| 16 | コミュニケーション | メッセージボード | 無効 | 有効 |  |  |
| 17 | ランディング | 7日間スタートプログラム | 選択中 | — |  |  |
| 18 | ランディング | 気づきノート AIコーチ | やってみる 有効 | やってみる 有効 | 会員同意→プレミアムコースへ |  |
| 19 | ランディング | 気づきノート パーソナルコーチ | 申し込む | 選択中 |  |  |
| 20 | コース変更 | フリーコース | — | — |  |  |
| 21 | コース変更 | スタンダードコース | — | 選択（90日データ保存メッセージ） |  |  |
| 22 | コース変更 | プレミアムコース | 選択 | 選択中（お試し付き） |  |  |
| 23 | 会員同意 | 利用規約・プライバシー | — | — |  |  |
| 24 | 申込フォーム | 入力欄 | — | 同意画面の後（アップグレード時は再同意なし） |  |  |

### 表7 — スタンダード → フリー（ダウングレード）

| # | UI（画面など） | コンポーネント | スタンダード（変化前） | フリー（変化後） | 備考 | OK |
|---|----------------|----------------|-------------|-------------|------|-----|
| 1 | ヘッダ | — | ログインユーザアイコン | ログインユーザアイコン |  |  |
| 2 | サイドバー | ホーム | 有効 | 有効 |  |  |
| 3 | サイドバー | スタート | 有効 | 有効 |  |  |
| 4 | サイドバー | ノート | 有効 | 無効 |  |  |
| 5 | サイドバー | コミュニケーション | 有効 | 有効 |  |  |
| 6 | サイドバー | マイページ | 無効 | 無効 |  |  |
| 7 | ホーム | バナー① | 同左 | スタートから始める→スタート |  |  |
| 8 | ホーム | バナー② | 気づきノートを続ける→ノート | 気づきノートを試す→ランディング |  |  |
| 9 | ホーム | マネジメント情報 | 有効 | 無効（メッセージ） |  |  |
| 10 | スタート画面 | 「気づきノート」ボタン | 有効（気づきへ） | 有効（試す→ランディング） | ノート画面へは行かない |  |
| 11 | ノート画面 | 行動宣言 | 有効 | 無効 |  |  |
| 12 | ノート画面 | 朝・晩 | 有効 | 無効 |  |  |
| 13 | ノート画面 | 週 | 有効 | 無効 |  |  |
| 14 | ノート画面 | 月 | 有効 | 無効 |  |  |
| 15 | コミュニケーション | 館長から | 有効 | 有効 |  |  |
| 16 | コミュニケーション | メッセージボード | 無効 | 無効 |  |  |
| 17 | ランディング | 7日間スタートプログラム | — | 選択中 |  |  |
| 18 | ランディング | 気づきノート AIコーチ | 選択中 | やってみる 有効 |  |  |
| 19 | ランディング | 気づきノート パーソナルコーチ | やってみる 有効 | やってみる 有効 |  |  |
| 20 | コース変更 | フリーコース | 選択（90日データ保存メッセージ） | — |  |  |
| 21 | コース変更 | スタンダードコース | 選択中（お試し付き） | — | 会員同意へ |  |
| 22 | コース変更 | プレミアムコース | 選択→会員同意→気づきノートのプレミアムコースへ | — |  |  |
| 23 | 会員同意 | 利用規約・プライバシー | — | — |  |  |
| 24 | 申込フォーム | 入力欄 | 同意画面の後 | — |  |  |

### 表8 — スタンダード → プレミアム（アップグレード）

| # | UI（画面など） | コンポーネント | スタンダード（変化前） | プレミアム（変化後） | 備考 | OK |
|---|----------------|----------------|-------------|-------------|------|-----|
| 1 | ヘッダ | — | ログインユーザアイコン | ログインユーザアイコン |  |  |
| 2 | サイドバー | ホーム | 有効 | 有効 |  |  |
| 3 | サイドバー | スタート | 有効 | 有効 |  |  |
| 4 | サイドバー | ノート | 有効 | 有効 |  |  |
| 5 | サイドバー | コミュニケーション | 有効 | 有効 |  |  |
| 6 | サイドバー | マイページ | 無効 | 無効 |  |  |
| 7 | ホーム | バナー① | 同左 | 同左 |  |  |
| 8 | ホーム | バナー② | 気づきノートを続ける→ノート | 気づきノートを続ける→ノート |  |  |
| 9 | ホーム | マネジメント情報 | 有効 | 有効 |  |  |
| 10 | スタート画面 | 「気づきノート」ボタン | 有効（気づきへ） | 有効（気づきへ） |  |  |
| 11 | ノート画面 | 行動宣言 | 有効 | 有効（共有あり） |  |  |
| 12 | ノート画面 | 朝・晩 | 有効 | 有効 |  |  |
| 13 | ノート画面 | 週 | 有効 | 有効（共有あり） |  |  |
| 14 | ノート画面 | 月 | 有効 | 有効（共有あり） |  |  |
| 15 | コミュニケーション | 館長から | 有効 | 有効 | 主な差分: MB有効 |  |
| 16 | コミュニケーション | メッセージボード | 無効 | 有効 |  |  |
| 17 | ランディング | 7日間スタートプログラム | — | — |  |  |
| 18 | ランディング | 気づきノート AIコーチ | 選択中 | やってみる 有効 |  |  |
| 19 | ランディング | 気づきノート パーソナルコーチ | やってみる 有効 | 選択中 |  |  |
| 20 | コース変更 | フリーコース | 選択（90日データ保存メッセージ） | 選択（90日データ保存メッセージ） | 90日データ保存メッセージ |  |
| 21 | コース変更 | スタンダードコース | 選択中（お試し付き） | 選択 | 会員同意→プレミアムコースへ |  |
| 22 | コース変更 | プレミアムコース | 選択→会員同意→気づきノートのプレミアムコースへ | 選択中（お試し付き） |  |  |
| 23 | 会員同意 | 利用規約・プライバシー | — | — | 初回申込時 |  |
| 24 | 申込フォーム | 入力欄 | 同意画面の後 | 同意画面の後 |  |  |

### 表9 — スタンダード → ゲスト（ログアウト）

| # | UI（画面など） | コンポーネント | スタンダード（変化前） | ゲスト（変化後） | 備考 | OK |
|---|----------------|----------------|-------------|-------------|------|-----|
| 1 | ヘッダ | — | ログインユーザアイコン | ゲストアイコンのみ | §5.3同型＋STD固有UIが無効化 |  |
| 2 | サイドバー | ホーム | 有効 | 有効 |  |  |
| 3 | サイドバー | スタート | 有効 | 無効 |  |  |
| 4 | サイドバー | ノート | 有効 | 無効 |  |  |
| 5 | サイドバー | コミュニケーション | 有効 | 有効 |  |  |
| 6 | サイドバー | マイページ | 無効 | 無効 |  |  |
| 7 | ホーム | バナー① | 同左 | 試してみる |  |  |
| 8 | ホーム | バナー② | 気づきノートを続ける→ノート | ログインして続ける |  |  |
| 9 | ホーム | マネジメント情報 | 有効 | 無効（メッセージ） |  |  |
| 10 | スタート画面 | 「気づきノート」ボタン | 有効（気づきへ） | 無効 |  |  |
| 11 | ノート画面 | 行動宣言 | 有効 | 無効 |  |  |
| 12 | ノート画面 | 朝・晩 | 有効 | 無効 |  |  |
| 13 | ノート画面 | 週 | 有効 | 無効 |  |  |
| 14 | ノート画面 | 月 | 有効 | 無効 |  |  |
| 15 | コミュニケーション | 館長から | 有効 | 有効 |  |  |
| 16 | コミュニケーション | メッセージボード | 無効 | 無効 |  |  |
| 17 | ランディング | 7日間スタートプログラム | — | やってみる 有効 |  |  |
| 18 | ランディング | 気づきノート AIコーチ | 選択中 | やってみる 有効 |  |  |
| 19 | ランディング | 気づきノート パーソナルコーチ | やってみる 有効 | やってみる 有効 |  |  |
| 20 | コース変更 | フリーコース | 選択（90日データ保存メッセージ） | — | PRE備考: 会員同意へ |  |
| 21 | コース変更 | スタンダードコース | 選択中（お試し付き） | — |  |  |
| 22 | コース変更 | プレミアムコース | 選択→会員同意→気づきノートのプレミアムコースへ | — |  |  |
| 23 | 会員同意 | 利用規約・プライバシー | — | 最後まで読んで同意（初回のみ） |  |  |
| 24 | 申込フォーム | 入力欄 | 同意画面の後 | — |  |  |

### 表10 — プレミアム → ゲスト（ログアウト）

| # | UI（画面など） | コンポーネント | プレミアム（変化前） | ゲスト（変化後） | 備考 | OK |
|---|----------------|----------------|-------------|-------------|------|-----|
| 1 | ヘッダ | — | ログインユーザアイコン | ゲストアイコンのみ |  |  |
| 2 | サイドバー | ホーム | 有効 | 有効 |  |  |
| 3 | サイドバー | スタート | 有効 | 無効 |  |  |
| 4 | サイドバー | ノート | 有効 | 無効 |  |  |
| 5 | サイドバー | コミュニケーション | 有効 | 有効 |  |  |
| 6 | サイドバー | マイページ | 無効 | 無効 |  |  |
| 7 | ホーム | バナー① | 同左 | 試してみる |  |  |
| 8 | ホーム | バナー② | 気づきノートを続ける→ノート | ログインして続ける |  |  |
| 9 | ホーム | マネジメント情報 | 有効 | 無効（メッセージ） |  |  |
| 10 | スタート画面 | 「気づきノート」ボタン | 有効（気づきへ） | 無効 |  |  |
| 11 | ノート画面 | 行動宣言 | 有効（共有あり） | 無効 |  |  |
| 12 | ノート画面 | 朝・晩 | 有効 | 無効 |  |  |
| 13 | ノート画面 | 週 | 有効（共有あり） | 無効 |  |  |
| 14 | ノート画面 | 月 | 有効（共有あり） | 無効 |  |  |
| 15 | コミュニケーション | 館長から | 有効 | 有効 |  |  |
| 16 | コミュニケーション | メッセージボード | 有効 | 無効 |  |  |
| 17 | ランディング | 7日間スタートプログラム | — | やってみる 有効 |  |  |
| 18 | ランディング | 気づきノート AIコーチ | やってみる 有効 | やってみる 有効 |  |  |
| 19 | ランディング | 気づきノート パーソナルコーチ | 選択中 | やってみる 有効 |  |  |
| 20 | コース変更 | フリーコース | 選択（90日データ保存メッセージ） | — |  |  |
| 21 | コース変更 | スタンダードコース | 選択 | — |  |  |
| 22 | コース変更 | プレミアムコース | 選択中（お試し付き） | — |  |  |
| 23 | 会員同意 | 利用規約・プライバシー | — | 最後まで読んで同意（初回のみ） |  |  |
| 24 | 申込フォーム | 入力欄 | 同意画面の後 | — |  |  |

### 表11 — プレミアム → フリー（ダウングレード）

| # | UI（画面など） | コンポーネント | プレミアム（変化前） | フリー（変化後） | 備考 | OK |
|---|----------------|----------------|-------------|-------------|------|-----|
| 1 | ヘッダ | — | ログインユーザアイコン | ログインユーザアイコン |  |  |
| 2 | サイドバー | ホーム | 有効 | 有効 |  |  |
| 3 | サイドバー | スタート | 有効 | 有効 |  |  |
| 4 | サイドバー | ノート | 有効 | 無効 |  |  |
| 5 | サイドバー | コミュニケーション | 有効 | 有効 |  |  |
| 6 | サイドバー | マイページ | 無効 | 無効 |  |  |
| 7 | ホーム | バナー① | 同左 | スタートから始める→スタート |  |  |
| 8 | ホーム | バナー② | 気づきノートを続ける→ノート | 気づきノートを試す→ランディング |  |  |
| 9 | ホーム | マネジメント情報 | 有効 | 無効（メッセージ） |  |  |
| 10 | スタート画面 | 「気づきノート」ボタン | 有効（気づきへ） | 有効（試す→ランディング） | 共有チェック無効化 |  |
| 11 | ノート画面 | 行動宣言 | 有効（共有あり） | 無効 |  |  |
| 12 | ノート画面 | 朝・晩 | 有効 | 無効 |  |  |
| 13 | ノート画面 | 週 | 有効（共有あり） | 無効 |  |  |
| 14 | ノート画面 | 月 | 有効（共有あり） | 無効 |  |  |
| 15 | コミュニケーション | 館長から | 有効 | 有効 | 新規投稿不可／履歴閲覧可／データ90日保存 |  |
| 16 | コミュニケーション | メッセージボード | 有効 | 無効 |  |  |
| 17 | ランディング | 7日間スタートプログラム | — | 選択中 |  |  |
| 18 | ランディング | 気づきノート AIコーチ | やってみる 有効 | やってみる 有効 |  |  |
| 19 | ランディング | 気づきノート パーソナルコーチ | 選択中 | やってみる 有効 |  |  |
| 20 | コース変更 | フリーコース | 選択（90日データ保存メッセージ） | — |  |  |
| 21 | コース変更 | スタンダードコース | 選択 | — |  |  |
| 22 | コース変更 | プレミアムコース | 選択中（お試し付き） | — |  |  |
| 23 | 会員同意 | 利用規約・プライバシー | — | — |  |  |
| 24 | 申込フォーム | 入力欄 | 同意画面の後 | — |  |  |

### 表12 — プレミアム → スタンダード（ダウングレード）

| # | UI（画面など） | コンポーネント | プレミアム（変化前） | スタンダード（変化後） | 備考 | OK |
|---|----------------|----------------|-------------|-------------|------|-----|
| 1 | ヘッダ | — | ログインユーザアイコン | ログインユーザアイコン |  |  |
| 2 | サイドバー | ホーム | 有効 | 有効 |  |  |
| 3 | サイドバー | スタート | 有効 | 有効 |  |  |
| 4 | サイドバー | ノート | 有効 | 有効 |  |  |
| 5 | サイドバー | コミュニケーション | 有効 | 有効 |  |  |
| 6 | サイドバー | マイページ | 無効 | 無効 |  |  |
| 7 | ホーム | バナー① | 同左 | 同左 |  |  |
| 8 | ホーム | バナー② | 気づきノートを続ける→ノート | 気づきノートを続ける→ノート |  |  |
| 9 | ホーム | マネジメント情報 | 有効 | 有効 |  |  |
| 10 | スタート画面 | 「気づきノート」ボタン | 有効（気づきへ） | 有効（気づきへ） |  |  |
| 11 | ノート画面 | 行動宣言 | 有効（共有あり） | 有効 |  |  |
| 12 | ノート画面 | 朝・晩 | 有効 | 有効 |  |  |
| 13 | ノート画面 | 週 | 有効（共有あり） | 有効 |  |  |
| 14 | ノート画面 | 月 | 有効（共有あり） | 有効 |  |  |
| 15 | コミュニケーション | 館長から | 有効 | 有効 | 新規投稿不可／履歴閲覧可／データ90日保存 |  |
| 16 | コミュニケーション | メッセージボード | 有効 | 無効 |  |  |
| 17 | ランディング | 7日間スタートプログラム | — | — |  |  |
| 18 | ランディング | 気づきノート AIコーチ | やってみる 有効 | 選択中 |  |  |
| 19 | ランディング | 気づきノート パーソナルコーチ | 選択中 | やってみる 有効 |  |  |
| 20 | コース変更 | フリーコース | 選択（90日データ保存メッセージ） | 選択（90日データ保存メッセージ） |  |  |
| 21 | コース変更 | スタンダードコース | 選択中（お試し付き） | 選択中（お試し付き） |  |  |
| 22 | コース変更 | プレミアムコース | 選択中（お試し付き） | 選択 |  |  |
| 23 | 会員同意 | 利用規約・プライバシー | — | — |  |  |
| 24 | 申込フォーム | 入力欄 | 同意画面の後 | 同意画面の後 |  |  |

---

---

## 6. 実装マッピング（メモ）

| 仕様 | コード／データ |
|------|----------------|
| メッセージボード | `resolveEntitlements` → `communication.message_board`（`plan === 'premium'` かつ有効契約） |
| ノート nav | `isKizukiNoteNavEnabled` / `hasAiCoachOrPremiumSignup`（`enrollmentCourse.ts`） |
| 7日間のみホーム | `shouldShowStart7dHomeHint` |
| 同意 | `users.consents`、`/consent?next=...` |
| コース変更 | `/courses/change` — `CourseChangePanel`・`courseSelectionCatalog` |
| 申込フォーム（仮） | `/apply?plan=standard\|premium` — `ApplyFormPanel`、`demoMerchantInfo.ts` |
| 28日お試し | `subscription.trialEndsAt`、`trialConsumedAt` |
| 90日保持 | `subscription.dataRetentionEndsAt` |

---

## 7. 実装フェーズ（案）

| 順 | 内容 | 状態 |
|----|------|------|
| 1 | 本ドキュメント確定 → 関連 doc の § 参照更新 | 進行中 |
| 2 | サイドバー（マイページ非表示）、バナー、entitlement 連動 | **マイページ非表示 実装済** |
| 3 | **コース変更・選択画面** `/courses/change` UI（Stripe 前） | **実装済**（3プラン＋機能表＋限定価格） |
| 4 | 申込フォーム `/apply?plan=...`（STD／PRE 初回） | **仮画面 実装済** |
| 5 | Stripe Phase C 連携 | 未着手 | 未着手 |

---

## 8. 参照

- [04_SUBSCRIPTION_PRODUCT_SCOPE.md](./04_SUBSCRIPTION_PRODUCT_SCOPE.md)
- [04_HOME_SCREEN_IMPLEMENTATION.md](./04_HOME_SCREEN_IMPLEMENTATION.md) §1.1〜1.3
- [04_COMMUNICATION_SCREEN_IMPLEMENTATION.md](./04_COMMUNICATION_SCREEN_IMPLEMENTATION.md)
- [04_TEST_ONBOARDING_CHECKLIST.md](./04_TEST_ONBOARDING_CHECKLIST.md)（手動テスト・**§1 初期化**）
- [03_FIRESTORE_DATABASE_STRUCTURE.md](./03_FIRESTORE_DATABASE_STRUCTURE.md) §2.1
- `src/lib/enrollmentCourse.ts`、`src/lib/subscription/resolveEntitlements.ts`

---

## 9. テスト用データ（Firebase）と初期化

状態遷移表（§5）を手動テストするとき、**Firestore のどの値が UI を決めるか**と、**初期状態（ゲスト）への戻し方**をまとめる。手順の詳細・チェック項目は [04_TEST_ONBOARDING_CHECKLIST.md](./04_TEST_ONBOARDING_CHECKLIST.md) §1 も参照。

### 9.1 「ゲスト」とは何か

| 状態 | 条件 | Firebase で触る場所 |
|------|------|---------------------|
| **ゲスト（未ログイン）** | ブラウザに **Auth セッションが無い**（`useAuth().user === null`） | **Firestore は読まれない**（UI は未認証として表示） |
| **フリー会員など（ログイン済）** | Google ログイン済み | **`users/{uid}`** の各フィールド |

**ゲストから導線チェック（フリー・スタンダード）を試すとき**

1. アプリで **ログアウト**（ヘッダーアバター → ログアウト）→ これだけで **ゲスト UI** になる。
2. 次にログインして **初回入会フローを最初から** やり直す場合は、§9.3 の Firestore リセットを **ログイン前またはログアウト中** に実施する。

シークレットウィンドウを使う場合も、Firestore のクリアは §9.3 が必要（同じ Google アカウントで再ログインすると既存プロファイルが残るため）。

### 9.2 状態遷移に関係するデータ一覧

| 保存場所 | フィールド | 役割（UI／導線への effect） | ゲスト時 | 新規プロファイル初期値（参考） |
|----------|------------|------------------------------|----------|--------------------------------|
| **Firebase Auth** | （セッション） | ログイン可否。**無ければゲスト** | なし | ログインで UID 発行 |
| `users/{uid}` | `consents` | **会員同意（A案・1回）**。未設定または版不一致 → `/consent?next=...` | ドキュメント自体なし | 未設定 |
| `consents.termsVersion` | 同意時の利用規約版（`terms.json` の `version` と一致要） | — | — |
| `consents.privacyVersion` | 同意時のプライバシー版 | — | — |
| `consents.acceptedAt` | 同意日時 | — | — |
| `users/{uid}` | `subscription.plan` | **会員種別の正本**（`free` / `standard` / `premium`）。サイドバー・MB・バナー等 | — | `free` |
| `subscription.status` | 契約状態（`active` 等） | entitlement 判定の補助 | — | `active` |
| `subscription.trialEndsAt` | **28日お試し**終了日時（STD/PRE 初回申込想定） | お試し中表示・コース変更「お試し付き」 | — | 新規作成時 +28日が入る実装あり※ |
| `subscription.trialConsumedAt` | お試し**消費済み**（再付与なし） | 再申込時のお試し可否 | — | 未設定 |
| `subscription.dataRetentionEndsAt` | 解約・ダウングレード後 **90日**でデータ削除予定 | オーバーレイ・MB履歴保持 | — | 未設定 |
| `subscription.courseId` | 論理コース（`ai_only` 等） | コーチ機能マトリクス（将来） | — | 未設定可 |
| `subscription.coaching.*` | 初回面談無料フラグ等 | プレミアム面談導線 | — | 未設定 |
| `users/{uid}` | `enrollment.primaryCourse` | **コース選択の記録**。`start7d` → 7日間のみ／ノート nav 無効、`kizuki` → 気づきノート導線 | — | 未設定 |
| `users/{uid}` | `role` | コーチ／管理者表示（状態遷移表の4列とは別軸） | — | `user` |

※ `createDefaultUserProfile` は `plan: free` でも `trialEndsAt` を +28日で入れる。**フリー会員に28日お試しは付与しない**仕様（§2.4）と実装がずれうる。テスト時は Console で `trialEndsAt` を削除してよい。

**本書の遷移表（plan 中心）に直接 effect しないが、テスト時に残るデータ**

| 保存場所 | 例 | 備考 |
|----------|-----|------|
| `users/{uid}/journal_*` 等 | 気づきノート本文 | ダウングレード・90日保持の**中身**確認用。UI 可否には `plan` / `enrollment` が優先 |
| `users/{uid}` | `weekStartsOn`, `trialAffirmationMeta` 等 | ノート UI 設定。コース遷移の可否には通常無関係 |
| 旧フィールド | `startProgram7dConsents` | **A案で廃止**。残っていてもアプリは参照しない |

**派生物（Firestore に保存しない）**

| 名称 | 入力 | 用途 |
|------|------|------|
| `resolveEntitlements(...)` | `UserProfile` | メッセージボード等の機能可否（`plan === 'premium'` 等） |

### 9.3 初期化パターン（何をクリアするか）

| 目的 | 操作 | 足りるか |
|------|------|----------|
| **画面をゲスト表示にする** | アプリ **ログアウト**（またはシークレット＋未ログイン） | ◎ **Firestore 変更不要** |
| **同じ UID で入会フロー（同意）だけやり直す** | Firestore: **`consents` フィールドを削除** → ログアウト → 再ログイン | ◎ 表1〜3 の「会員同意」行を再テスト |
| **コース選択・プランも含めて最初から** | Firestore: **`users/{uid}` ドキュメントごと削除** → ログアウト → 再ログイン | ◎ 次回 `createDefaultUserProfile` で `plan: free`・`consents` 無し |
| **完全に別人として試す** | 別 Google アカウント、または Auth ユーザ削除後に再登録 | ◎ |
| **プランだけ STD/PRE にしたい（Stripe 前）** | Console で `subscription.plan` を `standard` / `premium` に手動変更 | △ 表5以降の定常状態確認用 |

**ドキュメント削除時の注意**: `users/{uid}` を消すと **`journal_*` 等のサブコレクションも消える**（Console の削除範囲に注意）。

**推奨（表1 ゲスト→フリーから）**

```
1. ヘッダー → ログアウト（ゲスト UI を確認）
2. Firebase Console → Firestore → users → {テスト uid}
3. ドキュメントごと削除（または consents + enrollment + subscription を初期化）
4. ホーム「試してみる」→ ランディング → 7日間「やってみる」→ ログイン
```

**フィールド単位で戻す場合（ドキュメントは残す）**

| フィールド | 削除／初期値 | 効果 |
|------------|--------------|------|
| `consents` | **削除** | 再ログイン後 `/consent` が再表示 |
| `enrollment` または `enrollment.primaryCourse` | **削除** | 7日間／気づきノートの「選択中」がリセット |
| `subscription.plan` | `free` | フリー会員 UI に戻す |
| `subscription.trialEndsAt` | **削除** | お試し表示を消す（フリー想定テスト） |
| `subscription.trialConsumedAt` | **削除** | お試し消費フラグリセット |
| `subscription.dataRetentionEndsAt` | **削除** | 90日保持オーバーレイを消す |

### 9.4 関連ドキュメント（既存の記載場所）

| 内容 | 所在 |
|------|------|
| テストアカウント初期化手順（パターン A/B/C） | [04_TEST_ONBOARDING_CHECKLIST.md](./04_TEST_ONBOARDING_CHECKLIST.md) **§1** |
| `users/{uid}` フィールド定義（全般） | [03_FIRESTORE_DATABASE_STRUCTURE.md](./03_FIRESTORE_DATABASE_STRUCTURE.md) **§2.1** |
| 会員種別と `plan` の対応（概要） | 本書 **§1.3** |
| `plan` × `primaryCourse` | 本書 **§4** |
| コード ↔ データの対応（短いメモ） | 本書 **§6** |

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-06-05 | §5.5: 表6（フリー→プレミアム）を **導線フロー_6＋導線チェックリスト_6** に差し替え（導線①〜③） |
| 2026-06-05 | §5.4: **導線③**（スタート画面 → ランディング → スタンダード申込）を追加。導線フロー・チェックリスト・申込手順 C 列 |
| 2026-06-05 | §5.4: 7日間同意（`next=/start-program`）保存時に `enrollment.primaryCourse=start7d` を設定。コース変更画面「戻る」をランディング同型ボタンに統一 |
| 2026-06-05 | §5.4 実装: コース変更・選択画面（3プラン＋機能表＋オープン限定価格）。導線②＝戻る（ログイン維持） |
| 2026-06-05 | §5.4: 表5（フリー→スタンダード）を **導線フロー_5＋導線チェックリスト_5** に差し替え |
| 2026-06-05 | §5.3: 表4（フリー→ゲスト）を **導線フロー_4＋導線チェックリスト_4** に差し替え |
| 2026-06-05 | 導線チェックリスト_3（ゲスト→プレミアム）導線①〜⑧・申込手順 A-1〜A-7 **すべて OK**。週・月タブのコーチ共有を見出し右上に表示 |
| 2026-06-16 | 週タブ: `journal_weekly.sharedWithCoach` ＋ UI「コーチ共有」（閲覧のみ。質問は月次） |
| 2026-06-16 | プレミアム導線① NG 修正: デモ申込 `applyDemoPlanEnrollment` が `plan` のみ更新していたため `features.coachComments` が false のまま → `planDefaults` で features も同期 |
| 2026-06-16 | 気づきノート（`/trial_4w`）ログアウト時: ランディングへ飛ばないよう `shouldRedirectUnauthenticatedToLogin` を適用（ヘッダー logout → `/`） |
| 2026-06-16 | 導線⑦: 申込済み既会員が申込画面をチラ見せしないよう `resolveOnboardingDestination` を追加（`post-login`／`consent`／`ApplyFormPanel`） |
| 2026-06-16 | §5.1・§5.2: 導線フロー・チェックリストに **申込手順（デモ）** を追加。Mermaid に申込フォームノードを挿入 |
| 2026-06-16 | デモ申込: `applyDemoPlanEnrollment` 追加。送信後 `/trial_4w` へ自動遷移。スタンダードも `/apply?plan=standard`（特定商取引法デモ情報）経由に統一 |
| 2026-06-05 | §5.2: 表3（ゲスト→プレミアム）を **導線フロー_3＋導線チェックリスト_3** に差し替え |
| 2026-06-14 | §5.0・§5.1: 表1・表2 を **導線フロー＋チェックリスト** に差し替え（フリー①〜⑧ OK、スタンダード checklist 追加） |
| 2026-05-25 | 初版草案: 定常状態一覧、plan×primaryCourse、遷移表1〜12、全体方針、実装マッピング |
| 2026-05-25 | §3・§5 全行展開＋OK欄。コース変更・申込仮画面 |
| 2026-05-25 | §9 テスト用データ（Firebase）と初期化 |
