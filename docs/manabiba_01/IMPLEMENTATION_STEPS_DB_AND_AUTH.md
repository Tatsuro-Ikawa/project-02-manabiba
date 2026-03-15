# 実装手順：DB・認証連携（Phase 2）

## 📋 目的

Phase 1（[IMPLEMENTATION_STEPS_HOME_AND_TRIAL.md](./IMPLEMENTATION_STEPS_HOME_AND_TRIAL.md)）で実装したホーム・トライアル画面に、**認証（Firebase Authentication）とDB（Firestore）** を組み込み、次を実現するための手順です。

- **ユーザー権限（3ロール）** の定義と実装（一般ユーザ／ホスト＝コーチ／管理者）
- **ログイン状態**に応じたホーム・トライアルの表示切替
- **サブスクリプションの技術的器**（プラン種別・トライアル期間・有効期限の保持）。**決済・課金は本 Phase では実装しない**
- 必要に応じたトライアル用データの保存・読み込み

---

## 前提

- Phase 1 の成果物（ホーム `/`、トライアル `/trial_4w`、1026px レイアウト、サイドバー「ホーム」→ `/`）は完了していること。
- ホームの「認証状態に応じたログイン前／ログイン後の表示切替」は、本 Phase で実認証に差し替えながら検証する。

---

## 設計方針（ロール・サブスク）

実装の前提となる**ユーザー権限**と**サブスクリプションの器**は、別ドキュメントで定義する。

- **[ROLES_AND_SUBSCRIPTION_DESIGN.md](./ROLES_AND_SUBSCRIPTION_DESIGN.md)** を参照すること。
  - **ロール**: 一般ユーザ（クライアント）／ホストユーザ（コーチ）／管理者（アドミニストレータ）の3種。閲覧・編集権限の整理あり。
  - **サブスク**: フリー・期間限定（トライアル）・コース・個別追加などを**技術的な器**として定義。28日間トライアルは「28日間フリー → 以降有料」とし、決済は後フェーズで実装する。

---

## 進め方の流れ（手順一覧）

```
【0】ロール・サブスク設計の確認（ROLES_AND_SUBSCRIPTION_DESIGN.md）
    ↓
【1】ユーザー権限（ロール）の実装
    ↓
【2】ホーム画面を認証状態に連携する
    ↓
【3】トライアル画面の認証・ガード方針を決める（任意）
    ↓
【4】サブスクリプションの技術的器を拡張する（決済は含めない）
    ↓
【5】Firestore のコレクション・セキュリティルールを確認・拡張する
    ↓
【6】トライアル用データの保存・読み込みを設計・実装する（必要に応じて）
    ↓
【7】動作確認・チェックリスト
```

---

## 【0】ロール・サブスク設計の確認

**目的**: 実装前に [ROLES_AND_SUBSCRIPTION_DESIGN.md](./ROLES_AND_SUBSCRIPTION_DESIGN.md) を読み、3ロールの権限とサブスクの器（プラン種別・トライアル終了日など）を把握する。

### 0.1 やること

- ロール一覧（client / coach / admin）と権限の対応を確認する。
- 既存の `UserRole`（`src/types/auth.ts`）が `user` | `coach` | `admin` 等になっている場合、**一般ユーザを `user` のままクライアントとして扱う**か、**`client` に統一する**かを決める。
- サブスクでは「決済は実装しない」「プラン・トライアル終了日・ステータスを保持する器を用意する」ことを確認する。

### 0.2 成果物

- ロールとサブスクの方針がチーム内で共有されていること。

---

## 【1】ユーザー権限（ロール）の実装

**目的**: 3種類のロール（一般ユーザ＝クライアント、ホスト＝コーチ、管理者）をデータモデル・Firestore・画面で使えるようにする。

### 1.1 やること

- **型定義**（`src/types/auth.ts`）
  - `UserRole` を設計に合わせる。例: `'user' | 'coach' | 'admin'`（一般ユーザを `user` で表す場合）または `'client' | 'coach' | 'admin'`。
  - 既存の `senior_coach` を使っていなければ削除するか、将来用に残すかを決める。
- **Firestore ユーザープロファイル**
  - `users/{uid}` の `role` フィールドで上記ロールを保存・読み込みする。既存の `createDefaultUserProfile` のデフォルトは `user`（一般ユーザ）のままとする。
- **AuthContext・useAuth**
  - 既存の `hasRole(role)` がそのまま使えるようにする。必要なら `RoleGuard` で `client`（または `user`）／`coach`／`admin` を指定できるようにする。
- **管理者向けの入口**
  - 管理者（`admin`）のみアクセス可能なルート（例: `/admin`）や、ホームの「最新動画・参考リンク」編集 UI は、本 Step ではルートとガードの用意まででよい。編集機能の詳細は後段階でよい。

### 1.2 成果物

- ロールが Firestore のユーザープロファイルに保存され、`hasRole` / `RoleGuard` で画面出し分けができること。
- 既存のログイン・プロファイル取得が壊れないこと。

---

## 【2】ホーム画面を認証状態に連携する

**目的**: ホームの「ログイン前／ログイン後」表示を、URL パラメータ（`?logged_in=true`）ではなく **AuthContext（useAuth）の認証状態** で切り替える。

### 2.1 やること

- `src/components/HomePage.tsx` で **useAuth** を利用する。
- 表示切替に使う `loggedIn` を、**searchParams** ではなく **useAuth().user**（および `loading`）から算出する。
- モック用の `?logged_in=true` は、実認証を優先する場合は無視する方針でよい。

### 2.2 成果物

- ホームで「未ログイン時はログイン前表示」「ログイン済み時はログイン後表示」が、実認証状態に応じて切り替わること。
- Phase 1 チェックリストの「ホームで認証状態に応じたログイン前／ログイン後の表示切替ができる」を、実装と合わせて検証できること。

---

## 【3】トライアル画面の認証・ガード方針を決める（任意）

**目的**: `/trial_4w` を未ログインでも閲覧可能とするか、ログイン必須とするかを決め、必要なら AuthGuard 等をかける。

### 3.1 やること

- トライアルは**公開**（未ログインでもタブ閲覧可）とするか、**記録保存時のみログイン必須**とするか、**初回からログイン必須**とするかを決める。
- ログイン必須にする場合: `app/trial_4w/page.tsx` を **AuthGuard** でラップするか、ページ内で未ログイン時にログイン促しを表示する。
- 現状の `logged_in` クエリでヘッダー表示を変えている場合は、**useAuth** に統一するか削除する。

### 3.2 成果物

- トライアルの認証方針がドキュメントまたはコメントで明文化されていること。
- 方針に沿った表示・ガードが実装されていること。

---

## 【4】サブスクリプションの技術的器を拡張する（決済は含めない）

**目的**: プラン種別・トライアル終了日・ステータスなどを保持する**技術的な器**を用意する。決済・課金処理は実装しない。

### 4.1 やること

- **型・定数**（`src/types/auth.ts` または `src/types/subscription.ts`）
  - プラン種別を設計に合わせて拡張する。例: `free` | `trial` | `course` | `addon` 等。28日間トライアル用に `trial` および `trialEndDate` を扱えるようにする。
  - ステータス: `active` | `inactive` | `expired` | `cancelled` 等、既存と整合させる。
- **Firestore ユーザープロファイル（subscription 部分）**
  - `subscription.plan` / `subscription.status` / `subscription.startDate` / `subscription.endDate` に加え、**トライアル用**に `subscription.trialEndDate` などを追加する。
- **デフォルト値**
  - 新規ユーザーや「28日間トライアルを開始した」ユーザーには、`plan: 'trial'`（または `free`＋`trialEndDate`）と `trialEndDate = 登録日+28日` のような初期値を設定するロジックを用意する（実際の「トライアル開始」トリガーは画面・フローに合わせて後で接続してよい）。
- **画面での利用**
  - トライアル残り日数の表示、「28日後は有料」の案内など、既存の SubscriptionContext / useSubscription を拡張して表示できるようにする。
- **決済**
  - 本 Step では**決済 API・Webhook・課金履歴は実装しない**。器（プラン・日付・ステータス）だけを用意する。

### 4.2 成果物

- ユーザープロファイルにプラン・トライアル終了日・ステータスが保存され、画面で参照できること。
- 28日間トライアルを「28日間フリー、以降は有料」と表現できるデータ構造になっていること。

---

## 【5】Firestore のコレクション・セキュリティルールを確認・拡張する

**目的**: 既存の Firestore 構造と [FIRESTORE_SECURITY_RULES_SETUP.md](../FIRESTORE_SECURITY_RULES_SETUP.md) を確認し、ロールに応じたアクセス制御と、28日間トライアル用データの保存先を決める。

### 5.1 やること

- [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) の「6.1 Firestoreコレクション構造」を参照する。
- セキュリティルールで、**管理者向け**のサイト共通コンテンツ（例: 最新動画・参考リンク用コレクション）を用意する場合、`admin` のみ書き込み可などルールを追加する。
- コーチが**クライアントのデータ**を参照する場合、`coach` ロールと「担当クライアント」の対応をどのコレクションで持つか設計し、ルールに反映する（実装は後段階でも可）。
- 28日間トライアル用のサブコレクション（例: `users/{uid}/coaching-program/28day-trial/{date}`）が既存設計にあれば、そのまま利用する。無ければコレクション名とスキーマを決め、ルールに追加する。

### 5.2 成果物

- ロールとサブスクに必要な Firestore の構造とセキュリティルールが整理されていること。
- 必要に応じてルールの追加・更新内容がドキュメントまたはルールファイルで分かること。

---

## 【6】トライアル用データの保存・読み込みを設計・実装する（必要に応じて）

**目的**: トライアル画面（アファメーション・朝・晩・週・月）で入力した内容を Firestore に保存し、次回アクセス時に復元できるようにする。

### 6.1 やること

- 【5】で決めたコレクション構造に合わせて、Firestore の書き込み・読み込み関数を `src/lib/firestore.ts` に追加する。
- トライアル画面用の Custom Hook（例: `useTrialProgress`）を作成し、`useAuth` の `user.uid` を前提にデータ取得・保存を行う。
- 各タブのフォームと Hook を接続する。

### 6.2 成果物

- トライアルの入力データが Firestore に保存され、ログイン後に同じユーザーで表示・編集できること（範囲は優先度に応じて段階的に拡張してよい）。

---

## 【7】動作確認・チェックリスト

### 7.1 確認すること

- [ ] ロールがユーザープロファイルに保存され、`hasRole` / `RoleGuard` で出し分けできる。
- [ ] ホームで、**ログイン前**はログイン前用表示になる。
- [ ] ホームで、**ログイン後**はログイン後用表示（本日の一番・昨日までの積重ね等）になる。
- [ ] トライアルのサイドバー「ホーム」から `/` に遷移したとき、認証済みならホームがログイン後表示になる。
- [ ] サブスクの器（プラン・トライアル終了日）が保存・表示できる（決済は未実装でよい）。
- [ ] `npm run build` が成功する。
- [ ] （トライアルで保存を実装した場合）ログイン状態でトライアルの入力が保存・再表示できる。

### 7.2 成果物

- 上記チェックリストの結果メモ。不具合があれば【1】〜【6】に戻って修正する。

---

## 現状までの実装状況（メモ）

以下は 2025 年時点で実装済みの内容です。手順書と照らして確認・追記用です。

### 完了している項目

- **【1】ユーザー権限（ロール）**: `UserRole`（user / coach / admin）、`users/{uid}.role`、`hasRole`。表示モード切替（ViewModeContext: client / coach / admin）を実装。ヘッダーアバタークリックでロール・モード表示とアカウント設定・ログアウト。
- **【2】ホーム画面を認証状態に連携**: `HomePage` で `useAuth` を使用。ログイン前は「本日の一番」「昨日までの積重ね」非表示。ログイン後はホームに留まり、マイページはサイドバーから遷移。ログインリダイレクト先を `/` に変更。
- **【5】Firestore**: `site_content/home` を追加。`latestVideos`・`latestArticles`・`referenceLinks` の読み書き。セキュリティルールに `site_content/home`（read: 全員、create/update: isAdminUser()）とヘルパー `isAdminUser()` を追加。プロジェクトルートに `firebase.json`・`.firebaserc` を用意し、`firebase deploy --only firestore:rules` でデプロイ可能。
- **ホーム 管理者編集（最新動画）**: 管理者モード時のみ「編集」ボタン表示。`LatestVideosEditModal` で URL・タイトル・サムネイル・並び・作成者（author_name, author_url）を編集。`/api/youtube-oembed` で YouTube（Shorts 含む）のメタデータ取得。保存で `updateHomeLatestVideos`。カード表示は 4:3（幅 213px・高さ 160px）、object-fit: contain。
- **ホーム 管理者編集（最新記事）**: 管理者モード時のみ「編集」ボタン表示。`LatestArticlesEditModal` で URL・見出し・リード・出所・サムネイルURL・並びを編集。`/api/article-ogp` で記事 URL の OGP 取得。保存で `updateHomeLatestArticles`。カード表示は動画と同様のスタイルで横スクロール。
- **ホーム 管理者編集（いちおしサイト）**: セクション名「参考リンク」→「いちおしサイト」。管理者モード時のみ「編集」ボタン表示。`ReferenceLinksEditModal` で URL・タイトル・サイト名・サムネイルURL・並びを編集。「URLから情報を取得」で `/api/article-ogp` を流用。保存で `updateHomeReferenceLinks`。表示は縦並び・高さ 60px・左 16:9 サムネ・右にタイトル・サイト名。`content-right` 幅 328px（`content-left` 最大幅 948px）。
- **フッター**: 利用規約・プライバシーポリシー・コピーライトを実装。`ProtoFooter` で「利用規約」「プライバシーポリシー」リンク（`/terms`・`/privacy`）とコピーライト表示。`/terms`・`/privacy` はプレースホルダーページ（本文は準備中）。ホーム・各静的ページにフッター表示。
- **SNS セクション（home-section-sns）**: 運用方針決定まで CSS で非表示。復活時は `home-trial.css` の該当ルールを削除。
- **その他**: favicon を `public/favicon.ico` に移動（メタデータルートの 500 回避）。

### 未実装・今後の項目

- **【3】【4】【6】**: トライアルの認証ガード・サブスクの器の拡張・トライアル用データの保存は要件に応じて未実装または部分実装の可能性あり。
- **広告エリア（home-section-ad）**: `site_content/home` の `ad` の編集 UI は未実装。入力方法は運用方針決定後に実装。スキーマは [FIRESTORE_DATABASE_STRUCTURE.md](./FIRESTORE_DATABASE_STRUCTURE.md) に記載。

---

## 参照ドキュメント

- **ロール・サブスク設計**: [ROLES_AND_SUBSCRIPTION_DESIGN.md](./ROLES_AND_SUBSCRIPTION_DESIGN.md)
- **ホーム画面実装**: [HOME_SCREEN_IMPLEMENTATION.md](./HOME_SCREEN_IMPLEMENTATION.md)
- Phase 1: [IMPLEMENTATION_STEPS_HOME_AND_TRIAL.md](./IMPLEMENTATION_STEPS_HOME_AND_TRIAL.md)
- 要件定義書: [REQUIREMENTS_SPECIFICATION.md](./REQUIREMENTS_SPECIFICATION.md)（2.1 認証・認可、2.8.3 トライアル、2.11 ホーム）
- システムアーキテクチャ: [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)
- Firestore 構造: [FIRESTORE_DATABASE_STRUCTURE.md](./FIRESTORE_DATABASE_STRUCTURE.md)
- Firestore セキュリティルール: [FIRESTORE_SECURITY_RULES_SETUP.md](../FIRESTORE_SECURITY_RULES_SETUP.md)
- 機能一覧: [FEATURE_LIST.md](./FEATURE_LIST.md)

---

**次のアクション**: 上記「現状までの実装状況」を参照しつつ、【3】トライアル方針→【4】サブスクの器→【6】トライアルデータの順で進める。広告エリアの編集は運用方針決定後に [HOME_SCREEN_IMPLEMENTATION.md](./HOME_SCREEN_IMPLEMENTATION.md) を参照。決済・課金は別フェーズで実装。
