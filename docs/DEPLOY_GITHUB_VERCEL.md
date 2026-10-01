# GitHub への保存と Vercel でのデプロイ手順

## 1. GitHub に保存する

### 1.1 変更をコミットする

プロジェクトルートで以下を実行します。

```bash
# 状態確認
git status

# すべての変更をステージング
git add .

# コミット（メッセージは任意）
git commit -m "ホーム・フッター・いちおしサイト等を実装、SNSセクション非表示"
```

### 1.2 リモートがまだない場合（新規リポジトリ）

1. [GitHub](https://github.com) で **New repository** を作成する（例: `project-02-manabiba`、Private 可）。
2. リポジトリ作成後、表示される「…or push an existing repository from the command line」のコマンドを実行する。

```bash
git remote add origin https://github.com/<あなたのユーザー名>/project-02-manabiba.git
git branch -M main
git push -u origin main
```

### 1.3 すでにリモートがある場合

```bash
git push origin main
```

（ブランチ名が `main` でない場合は `git branch` で確認し、その名前で push）

---

## 2. Vercel でデプロイする

### 2.1 Vercel にログイン

1. [Vercel](https://vercel.com) にアクセスし、**Continue with GitHub** でログインする。
2. 初回は GitHub の「Vercel にリポジトリへのアクセスを許可する」を承認する。

### 2.2 プロジェクトのインポート

1. ダッシュボードで **Add New…** → **Project** をクリック。
2. **Import Git Repository** で、先ほど push したリポジトリを選択する。
3. **Configure Project** で以下を確認する。
   - **Framework Preset**: Next.js（自動検出）
   - **Root Directory**: そのまま（`./`）
   - **Build Command**: `npm run build`（デフォルト）
   - **Output Directory**: `.next`（Next.js のデフォルト）
   - **Project Name**: ここで任意の名前を指定できる。未入力の場合は GitHub のリポジトリ名が使われる。

そのまま **Deploy** をクリックする。

### 2.2.1 プロジェクト名を Firebase に合わせて変更する（既にデプロイ済みの場合）

Vercel の「プロジェクト名」は、デフォルトの URL（`https://<プロジェクト名>.vercel.app`）に使われます。Firebase に登録した名称（または任意の名前）にしたい場合：

1. [Vercel ダッシュボード](https://vercel.com/dashboard) を開く。
2. 対象の **プロジェクト** をクリックする。
3. 上部メニューから **Settings** をクリックする。
4. **General** の **Project Name** を探す。
5. 名前を変更（例: Firebase のプロジェクト表示名や `plandosee-project-01` など）し、**Save** する。

**注意**:
- 変更後、デプロイ URL は `https://<新しい名前>.vercel.app` になる（既に他で使われている名前は使えません）。
- **Firebase の認証**を使う場合、[Firebase Console](https://console.firebase.google.com) → **Authentication** → **Sign-in method** → **Authorized domains** に、新しい Vercel の URL のドメイン（例: `新しい名前.vercel.app`）を **Add domain** で追加する必要があります。

### 2.3 環境変数（任意だが推奨）

Firebase を本番でも明示的に設定したい場合、**Project Settings → Environment Variables** で次を追加する。

| 名前 | 値 | 備考 |
|------|-----|------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | （Firebase の値） | Firebase Console のプロジェクト設定から |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `plandosee-project-01.firebaseapp.com` | 同上 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `plandosee-project-01` | 同上 |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | （Firebase の値） | 同上 |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | （Firebase の値） | 同上 |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | （Firebase の値） | 同上 |

※ 現在のコードは未設定時はフォールバック値を使うため、設定しなくても動く可能性はありますが、本番では環境変数での設定を推奨します。

### 2.4 Firebase の「認証済みドメイン」に Vercel の URL を追加

Google ログイン等が動くようにするため、Firebase 側で Vercel のドメインを許可します。

1. [Firebase Console](https://console.firebase.google.com) → 対象プロジェクト（plandosee-project-01）を開く。
2. **Authentication** → **Sign-in method** → **Authorized domains** を開く。
3. **Add domain** で、**Vercel のプロジェクト名に応じたドメイン**を追加する。
   - 例: プロジェクト名が `plandosee-project-01` なら `plandosee-project-01.vercel.app`
   - プロジェクト名を変更した場合は、その名前の `.vercel.app` を追加する。
   - カスタムドメインを使う場合はそのドメインも追加する。

### 2.5 URL が長い場合（`*-git-main-*-projects.vercel.app` と表示されるとき）

**長い URL**（例: `https://project-02-manabiba-git-main-tatsuro-ikawas-projects.vercel.app/`）は、**ブランチごとのプレビュー用URL**です。通常、本番用の**短いURL**も別にあります。

#### 短い本番URLを確認する

1. [Vercel ダッシュボード](https://vercel.com/dashboard) で対象プロジェクトを開く。
2. 上部メニューの **Settings** → **Domains** を開く。
3. **Domains** の一覧に、次のようなドメインが表示されます。
   - **Production**: 本番用（例: `project-02-manabiba.vercel.app` や `project-02-manabiba-<チーム名>.vercel.app`）。
   - 長い `*-git-main-*` はプレビュー用のため、普段のアクセスには **Production のドメイン**を使います。

プロジェクトトップの **Deployments** で、最新のデプロイの **「Production」** バッジが付いている行の **Visit** をクリックすると、本番URLで開けます。

#### 短いURL（`プロジェクト名.vercel.app`）にしたい場合

- **Settings** → **General** の **Project Name** を、使いたい名前（例: `manabiba` や `plandosee-project-01`）に変更して **Save** する。
- その後、**Settings** → **Domains** で、`<新しいプロジェクト名>.vercel.app` が Production に割り当てられているか確認する。
- チーム/オーガニゼーションでデプロイしている場合、`<プロジェクト名>.vercel.app` がすでに割り当てられていれば、そのURLが本番用です。長いURLはプレビュー用のため無視してかまいません。

**Firebase の認証**を使う場合は、**実際にアクセスに使うドメイン**（本番の短いURLのドメイン）を、Firebase の **Authorized domains** に追加してください。

### 2.6 Firestore（セキュリティルール・インデックス）のデプロイ

**Next.js（Vercel）のデプロイとは別物**です。`firestore.rules` や `firestore.indexes.json` をリポジトリで変更した場合、**Firebase 側に反映するには CLI からのデプロイが必要**です。

| 方式 | 説明 |
|------|------|
| **手動（ローカル CLI）** | 開発者が自分の PC で `firebase deploy` を実行する。本リポジトリでは通常これ。 |
| **自動（CI）** | GitHub Actions 等で `firebase deploy` を組み込めば push 時に自動化可能。現状は未設定なら手動。 |
| **コンソール** | ルールをエディタに貼る方法もあるが、**リポジトリの `firestore.rules` と本番の乖離**を防ぐため、**CLI でファイルをデプロイする運用を推奨**。 |

プロジェクトルートで（Firebase CLI ログイン・プロジェクト選択済みであること）:

```bash
# ルールとインデックスのみ（よく使う）
firebase deploy --only firestore:rules,firestore:indexes

# ルールのみ
firebase deploy --only firestore:rules
```

ルールをデプロイしないと、**ローカルで編集した内容が本番 Firestore に効かず**、`Missing or insufficient permissions` などの原因になります。コード（Vercel）と**同じタイミングで**ルール変更を本番へ載せる運用にすると安全です。

---

## 3. ブランチとデプロイ環境の使い分け

| ブランチ | 用途 | Vercel 環境 |
|----------|------|-------------|
| **`main`** | 機能改善・バグ修正（本番に載せる変更） | **Production** |
| **`inspect`** | 新機能の開発・Preview 確認 | **Preview** |

ローカルの開発環境は **1つで十分** です。ブランチは checkout で切り替え、**デプロイ先**（Production / Preview）を分けます。

### 3.1 本番反映（`main`）

```bash
git checkout main
git pull origin main
# … 変更・コミット …
git push origin main
```

### 3.2 新機能の Preview 確認（`inspect`）

```bash
git checkout inspect
git pull origin inspect
# … 変更・コミット …
git push origin inspect
```

Vercel の **Deployments** でブランチ `inspect` の **Visit** から Preview URL を開きます。

### 3.3 急ぎ修正と新機能を並行するとき

1. 修正は **`main`** で commit → push（本番反映）
2. **`inspect`** に戻り `git merge main` で修正を取り込む
3. 新機能開発を続行

### 3.4 新機能を本番公開

完成後、`inspect` を `main` にマージして push します。Feature Flag を使っている場合は §3.5 のとおり Production の Flag を ON にします。

---

## 3.5 Feature Flag（リリース前機能の ON/OFF）

**同じコードを `main` に載せたまま**、本番では非表示・Preview では表示できます。環境変数（方式 A）で切り替えます。

定義は **`src/lib/featureFlags.ts`** に集約してください。

### 初回セットアップ（Vercel）

[Project Settings → Environment Variables](https://vercel.com/docs/projects/environment-variables) で次を追加します。

| 名前 | Production | Preview | Development |
|------|------------|---------|-------------|
| `NEXT_PUBLIC_FF_START_PROGRAM_REFRESH` | `false` | `true` | 任意（未設定で OFF） |

- **Production**（`https://www.jinsei-manabiba.com` 等）: Flag OFF → 現行 UI
- **Preview**（`inspect` push 後の URL）: Flag ON → 刷新 UI

環境変数を追加・変更したあとは、対象環境で **Redeploy** が必要な場合があります。

### ローカルで刷新 UI を確認

プロジェクトルートに `.env.local`（git 管理外）を作成:

```bash
NEXT_PUBLIC_FF_START_PROGRAM_REFRESH=true
```

`npm run dev` を再起動して `/start-program` を開きます。

### 対象画面: `/start-program`（7日間スタートプログラム全面刷新）

| Flag | 表示 |
|------|------|
| OFF（本番デフォルト） | `StartProgramLegacyView` — 現行 PDF 案内 |
| ON（Preview） | `StartProgramRefreshView` — 刷新 UI（`src/components/start-program/`） |

刷新の実装は **`StartProgramRefreshView.tsx`** に追加します。認証・同意・サイドバーは `page.tsx` 共通のままです。

### 本番公開の手順

1. Preview で刷新 UI を確認
2. `main` にマージ（必要なら `inspect` 経由）
3. Vercel で **`NEXT_PUBLIC_FF_START_PROGRAM_REFRESH` を Production も `true`** に変更
4. Production を Redeploy（または `main` を push して再デプロイ）

公開後、安定したら Flag 分岐を削除し刷新 UI を常時表示にリファクタリングしても構いません。

### 新しい Flag を足すとき

1. `src/lib/featureFlags.ts` に `isXxxEnabled()` と `FEATURE_FLAG_ENV_KEYS` を追加（`process.env.NEXT_PUBLIC_FF_*` は **リテラル参照**。`process.env[key]` はクライアントで効かない）
2. UI / API を Flag でガード（ページ直リンク対策も忘れずに）
3. Vercel に Production=`false` / Preview=`true` で環境変数を登録
4. 本ドキュメントの表に1行追記

**注意**: Preview も本番と **同じ Firebase** に接続している場合、Preview テストのデータは本番 DB に書き込まれます。

---

## 4. 今後の更新フロー（クイックリファレンス）

| やりたいこと | 操作 |
|--------------|------|
| 本番に載せる修正 | `main` に commit → `git push origin main` |
| 新機能を Preview で見る | `inspect` に commit → push。Flag は Preview=ON |
| 刷新を本番公開 | Production の Flag を `true` にして redeploy |

---

## 5. トラブルシューティング

| 現象 | 確認すること |
|------|----------------|
| ビルドが失敗する | Vercel の **Deployments** のログでエラー行を確認。`npm run build` をローカルで実行して再現する。 |
| ログインできない | Firebase の **Authorized domains** に Vercel のドメインが入っているか確認する。Preview URL も追加。 |
| 画面が真っ白 | ブラウザのコンソールでエラーを確認。Firebase の設定や環境変数が本番で正しいか確認する。 |
| Preview で刷新 UI が出ない | Vercel の `NEXT_PUBLIC_FF_START_PROGRAM_REFRESH` が Preview=`true` か。Redeploy 済みか。 |
| 本番で刷新 UI が見える | Production の Flag が `false` か。誤って `true` になっていないか。 |
