# GoalSettingSMART コンポーネント

SMART目標設定フレームワークに基づいた、段階的な目標設定UIコンポーネント群です。

## 概要

テーマ選択プロセスで選択されたテーマを基に、以下の4つのステップで具体的な目標を設定します：

1. **S: Specific（具体的）** - 目標を具体的に表現
2. **M: Measurable（測定可能）** - 測定方法・指標を設定
3. **R: Relevant（関連性）** - 目標の重要性・価値観との関連を明確化
4. **T: Time-bound（期限設定）** - 達成期限とマイルストーンを設定

## ファイル構成

```
GoalSettingSMART/
├── index.tsx                 # メインコンポーネント
├── ProgressIndicator.tsx     # 進捗表示バー
├── SupportAccordion.tsx      # サポート情報アコーディオン
├── SpecificStep.tsx          # S: 具体的な目標設定
├── MeasurableStep.tsx        # M: 測定方法設定
├── RelevantStep.tsx          # R: 関連性・重要性設定
├── TimeboundStep.tsx         # T: 期限設定
├── GoalSummary.tsx           # 最終確認画面
└── README.md                 # このファイル
```

## 使い方

### 基本的な使用方法

```tsx
import GoalSettingSMART from '@/components/GoalSettingSMART';

function MyComponent() {
  const handleComplete = () => {
    console.log('目標設定完了');
    // 次のステップへの遷移処理
  };

  const handleBack = () => {
    console.log('前のステップに戻る');
    // テーマ選択画面に戻る処理
  };

  return (
    <GoalSettingSMART
      userType="aspiration"
      onComplete={handleComplete}
      onBack={handleBack}
    />
  );
}
```

### Props

| Prop | 型 | デフォルト | 説明 |
|------|------|-----------|------|
| `userType` | `'aspiration' \| 'problem'` | `'aspiration'` | コースタイプ（願望実現 or 課題解決） |
| `onComplete` | `() => void` | - | 目標設定完了時のコールバック |
| `onBack` | `() => void` | - | 前のステップに戻る時のコールバック |

## 前プロセスとの連携

このコンポーネントは、テーマ選択プロセスからデータを引き継ぎます：

```tsx
// useThemeSelectionフックで選択されたテーマを取得
const { data: themeData } = useThemeSelection(sessionId);
const selectedTheme = themeData?.selectedTheme;
```

選択されたテーマは、各ステップの上部に表示され、ユーザーが目標設定の文脈を常に意識できるようになっています。

## データ構造

### SMARTGoalFormData

```typescript
interface SMARTGoalFormData {
  specificDescription: string;        // S: 具体的な目標
  measurementValue: string;           // M: 測定値
  measurementUnit: string;            // M: 単位
  measurementFrequency: string;       // M: 測定頻度
  relevanceReason: string;            // R: 重要な理由
  relatedValues: string[];            // R: 関連する価値観
  targetDate: string;                 // T: 目標達成日
  milestones: Milestone[];            // T: マイルストーン
}
```

### Milestone

```typescript
interface Milestone {
  id: string;
  title: string;
  targetDate: Date;
  completed: boolean;
}
```

## 各ステップの詳細

### 1. Specific（具体的）

- 最低20文字以上の入力を要求
- 5W1Hを意識した具体的な表現をサポート
- 良い例・悪い例を提示

### 2. Measurable（測定可能）

- 目標値（数値）の入力
- 単位の選択（点、回、kg、時間など）
- カスタム単位の入力も可能
- 測定頻度の設定

### 3. Relevant（関連性）

- 価値観タグの選択（家族、健康、成長など）
- 最低20文字以上の理由の記述
- 考えるヒント（プロンプト）を提示

### 4. Time-bound（期限設定）

- カレンダーピッカーでの日付選択
- 「今から○ヶ月後」の自動計算表示
- オプション：中間マイルストーンの設定

### 5. 最終確認（Complete）

- すべての設定内容の確認
- 各項目の編集リンク
- 目標の保存

## UI/UXの特徴

### プログレッシブディスクロージャー
一度に1つのステップのみ表示し、ユーザーの認知負荷を軽減

### サポート情報のアコーディオン
必要に応じて展開できるヘルプ情報を各ステップに配置

### 進捗の可視化
ステップインジケーターで現在地と進捗を常に表示

### バリデーション
各ステップで必須項目の入力チェックを実施

### レスポンシブ対応
スマホ、タブレット、PCの各デバイスで最適化された表示

## スタイリング

Tailwind CSSを使用しています。各ステップには色分けされたテーマカラーを使用：

- S: Blue (具体的)
- M: Green (測定可能)
- R: Purple (関連性)
- T: Orange (期限設定)

## TODO: 今後の実装予定

- [ ] Firestoreへのデータ保存機能
- [ ] 保存された目標の編集機能
- [ ] 目標の進捗トラッキング機能
- [ ] 目標達成の可視化（グラフ表示）
- [ ] 目標のカテゴリ分類

## 注意事項

現在、目標のFirestoreへの保存は未実装です。`index.tsx`の`handleComplete`関数内でコメントアウトされているコードを実装してください。

## ライセンス

このコンポーネントはプロジェクト内部での使用を想定しています。

