# システムアーキテクチャ設計書

## 📋 ドキュメント情報

| 項目 | 内容 |
|------|------|
| **文書名** | システムアーキテクチャ設計書 |
| **バージョン** | 1.3.0 |
| **作成日** | 2024年12月27日 |
| **最終更新日** | 2025年12月28日 |
| **作成方法** | リバースエンジニアリング |

---

## 1. システム構成

### 1.1 全体構成

```
┌─────────────────────────────────────────────────┐
│           クライアント（ブラウザ）                │
│  ┌──────────────────────────────────────────┐  │
│  │         Next.js 15 (React 19)            │  │
│  │  ┌──────────┐  ┌──────────┐            │  │
│  │  │  Pages   │  │Components│            │  │
│  │  └──────────┘  └──────────┘            │  │
│  │  ┌──────────┐  ┌──────────┐            │  │
│  │  │  Hooks   │  │  Context │            │  │
│  │  └──────────┘  └──────────┘            │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                      │
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────┐
│            Firebase サービス                     │
│  ┌──────────────┐  ┌──────────────┐          │
│  │ Authentication│  │  Firestore   │          │
│  │  (Google)     │  │  (NoSQL DB)  │          │
│  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────┘
```

### 1.2 技術スタック

#### フロントエンド
- **フレームワーク**: Next.js 15.4.5
- **UIライブラリ**: React 19.1.0
- **言語**: TypeScript 5.x
- **スタイリング**: Tailwind CSS 4.x, Material-UI 7.3.2
- **チャート**: Recharts 3.1.2
- **動画**: Zoom Video SDK
- **状態管理**: React Context API, Custom Hooks

#### バックエンド・インフラ
- **認証**: Firebase Authentication (Google Sign-In)
- **データベース**: Cloud Firestore
- **ホスティング**: Firebase Hosting（予定）

---

## 2. アーキテクチャパターン

### 2.1 レイヤー構成

```
┌─────────────────────────────────────┐
│      Presentation Layer             │
│  (Pages, Components)                │
├─────────────────────────────────────┤
│      Business Logic Layer           │
│  (Custom Hooks, Context)            │
├─────────────────────────────────────┤
│      Data Access Layer              │
│  (Firestore Functions)              │
├─────────────────────────────────────┤
│      Infrastructure Layer           │
│  (Firebase SDK)                     │
└─────────────────────────────────────┘
```

### 2.2 コンポーネント構成

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # ホームページ（SCREEN-000）
│   ├── landing/           # ランディングページ（SCREEN-001）
│   ├── login/             # ログインページ（SCREEN-002）
│   ├── mypage/            # マイページ（SCREEN-003）
│   └── [各種ページ]
├── components/            # Reactコンポーネント
│   ├── GoalSettingSMART/ # SMART目標設定
│   ├── ThemeSelection/   # テーマ選択
│   ├── SelfUnderstanding/ # 自己理解機能
│   ├── CoachingProgram/  # コーチングプログラム（7日間/28日間）
│   ├── Video/            # 動画機能（Zoom Video SDK、動画プレイヤー）
│   └── [その他コンポーネント]
├── hooks/                 # Custom Hooks
│   ├── useAuth.ts
│   ├── usePDCA.ts
│   ├── useGoals.ts
│   ├── useSelfUnderstanding.ts
│   ├── useCoachingProgram.ts
│   └── [その他フック]
├── lib/                   # ライブラリ・ユーティリティ
│   ├── firebase.ts
│   └── firestore.ts
├── context/               # React Context
│   ├── AuthContext.tsx
│   └── SubscriptionContext.tsx
└── types/                 # TypeScript型定義
    ├── auth.ts
    ├── goals.ts
    └── [その他型定義]
```

---

## 3. データフロー

### 3.1 認証フロー

```
ユーザー
  ↓
LandingPage
  ↓
Login Page (Google Sign-In)
  ↓
Firebase Authentication
  ↓
AuthContext (認証状態管理)
  ↓
AuthGuard (認証チェック)
  ↓
MyPage / その他ページ
```

### 3.2 PDCAデータフロー

```
ユーザー入力
  ↓
PDCAInputModal
  ↓
usePDCA Hook
  ↓
Firestore Functions
  ↓
Cloud Firestore
  ↓
データ保存・取得
  ↓
UI更新
```

### 3.3 目標設定フロー

```
テーマ選択完了
  ↓
GoalSettingSMART
  ↓
各ステップ（S, M, R, T）
  ↓
自動保存（2秒debounce）
  ↓
Firestore (users/{uid}/smart-goals)
  ↓
目標確定
```

### 3.4 コーチングプログラムフロー

```
プログラム開始
  ↓
CoachingProgram Component
  ↓
Step0（インテーク）
  ↓
1日目 Step1: 自己理解（SELF-001）
  ↓ Firestore (users/{uid}/self-understanding)
2日目 Step2: 自分らしさ探索（SELF-002）
  ↓ Firestore (users/{uid}/self-understanding)
3日目 Step3: 心のブレーキ探索（SELF-003）
  ↓ Firestore (users/{uid}/self-understanding)
4日目 Step4: テーマ選択（THEME-001〜007）
  ↓ Firestore (users/{uid}/theme-selection)
5日目 Step5: SMART目標設定（GOAL-001〜004）
  ↓ Firestore (users/{uid}/smart-goals)
6日目 Step6: Do目標設定（GOAL-005）
  ↓ Firestore (users/{uid}/smart-goals)
7日目 Step7: Be目標設定（GOAL-006）
  ↓ Firestore (users/{uid}/smart-goals)
Step8: アファメーション作成（GOAL-006）
  ↓ Firestore (users/{uid}/smart-goals)
28日間トライアル開始
  ↓
日次記録（朝/夜）
  ↓ Firestore (pdca_entries または coaching_program_entries)
進捗管理・完了
```

**データ共有の設計思想**:
- コーチングプログラムの各ステップは既存機能（自己理解、テーマ選択、目標設定）とデータを共有
- ユーザーはコーチングプログラム経由でも、各機能から直接でも、同じデータにアクセス可能
- 進捗管理は各機能のデータ完了状態を参照して追跡

### 3.5 動画セッションフロー

```
ユーザー
  ↓
動画セッション開始（Zoom Video SDK / 動画リンク）
  ↓
Video Component
  ↓
Zoom Video SDK統合（VIDEO-001）
  ↓
動画プレイヤー（VIDEO-002）
  ↓
セッション終了・記録保存
```

---

## 4. セキュリティアーキテクチャ

### 4.1 認証・認可

- **認証**: Firebase Authentication（Google Sign-In）
- **認可**: Firestoreセキュリティルール
- **データアクセス**: ユーザーは自分のデータのみアクセス可能

### 4.2 データ保護

- **暗号化**: テーマ選択データは暗号化して保存
- **HTTPS**: 本番環境ではHTTPS必須
- **セキュリティルール**: Firestoreセキュリティルールで保護

---

## 5. 状態管理

### 5.1 Context API

- **AuthContext**: 認証状態管理
- **SubscriptionContext**: サブスクリプション状態管理

### 5.2 Custom Hooks

- **useAuth**: 認証関連のロジック
- **usePDCA**: PDCAデータ管理
- **useGoals**: 目標管理
- **useThemeSelection**: テーマ選択管理
- **useSelfUnderstanding**: 自己理解データ管理
- **useCoachingProgram**: コーチングプログラム進捗管理
- **useVideo**: 動画セッション管理（Zoom Video SDK、動画プレイヤー）
- **useUserProfile**: ユーザープロファイル管理

---

## 6. データモデル

### 6.1 Firestoreコレクション構造

```
users/
  {uid}/
    ├── subscription (サブスクリプション情報)
    ├── smart-goals/
    │   └── {goalId} (SMART目標)
    ├── theme-selection/
    │   └── {sessionId} (テーマ選択セッション)
    ├── self-understanding/ (自己理解データ)
    │   ├── mandala (曼荼羅チャートデータ)
    │   ├── values (価値観データ)
    │   └── brakes (心のブレーキデータ)
    ├── coaching-program/ (コーチングプログラム進捗)
    │   ├── 7day-program (7日間プログラム進捗)
    │   │   ├── step0 (完了状態、最終更新日)
    │   │   ├── step1 (WS1データ、完了状態)
    │   │   ├── step2 (WS2/WS3データ、完了状態)
    │   │   ├── step3 (WS4データ、完了状態)
    │   │   ├── step4 (WS5/WS6データ、完了状態)
    │   │   ├── step5 (WS7データ、完了状態)
    │   │   ├── step6 (WS8データ、完了状態)
    │   │   ├── step7 (WS9/WS10データ、完了状態)
    │   │   └── step8 (WS11アファメーション、完了状態)
    │   └── 28day-trial/ (28日間トライアル記録)
    │       └── {date} (日次記録: 朝/夜)
    └── progress (進捗データ)

pdca_entries/
  └── {entryId} (PDCAエントリ)

coaching_sessions/
  └── {sessionId} (コーチングセッション)

goals/
  └── {goalId} (一般目標)

ai_analyses/
  └── {analysisId} (AI分析)
```

---

## 7. パフォーマンス最適化

### 7.1 実装済み

- **自動保存**: 2秒debounceで自動保存
- **データ取得**: 必要なデータのみ取得
- **コンポーネント分割**: 適切なコンポーネント分割

### 7.2 今後の改善

- **キャッシュ**: データのキャッシュ機能
- **ページネーション**: 大量データのページネーション
- **最適化**: バンドルサイズの最適化

---

## 8. エラーハンドリング

### 8.1 エラー処理

- **認証エラー**: ログインページへリダイレクト
- **データ取得エラー**: エラーメッセージ表示
- **保存エラー**: エラーメッセージ表示、再試行機能

### 8.2 ログ

- **コンソールログ**: 開発環境でのデバッグログ
- **エラーログ**: エラー発生時のログ出力

---

## 9. デプロイメント

### 9.1 開発環境

- **ローカル開発**: `npm run dev`
- **ポート**: localhost:3000

### 9.2 本番環境（予定）

- **ホスティング**: Firebase Hosting
- **ビルド**: `npm run build`
- **起動**: `npm start`

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.3.0 | 2025-12-28 | **ホームページ機能の追加**<br>- コンポーネント構成にホームページ（`app/page.tsx`、SCREEN-000）を追加<br>- ホームページは静的コンテンツ中心（料金プラン、お問い合わせ、組織情報等）<br>- お問い合わせフォームはFirebase Functions経由で送信予定 |
| 1.2.0 | 2025-12-27 | **動画機能の優先度変更と追加**<br>- 動画機能（VIDEO-001、VIDEO-002）の優先度を「高」に変更<br>- 技術スタックに「Zoom Video SDK」を追加<br>- コンポーネント構成に`Video/`を追加<br>- 3.5「動画セッションフロー」を新設<br>- Custom Hooksに`useVideo`を追加 |
| 1.1.0 | 2025-12-27 | **コーチングプログラム機能の追加**<br>- 3.4「コーチングプログラムフロー」を新設<br>- データモデルにコーチングプログラム関連のデータ構造を追加（7日間プログラム、28日間トライアル）<br>- コンポーネント構成に`CoachingProgram/`を追加<br>- Custom Hooksに`useCoachingProgram`、`useSelfUnderstanding`を追加<br>- データ共有の設計思想を明記 |
| 1.0.0 | 2024-12-27 | 初版作成 |

