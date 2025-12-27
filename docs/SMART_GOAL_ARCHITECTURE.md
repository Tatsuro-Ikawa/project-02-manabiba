# SMART目標とPDCAの関連構造分析

## 現在のデータ構造

### 1. テーマ選択データ
```
users/{userId}/theme-selection/{sessionId}
{
  id: "aspiration_session",
  userType: "aspiration",
  entries: [
    {id: "entry_1", text: "英語力を向上させたい", ...},
    {id: "entry_2", text: "健康になりたい", ...}
  ],
  selectedTheme: "entry_1",  // ← 選択されたテーマのID
  completed: true,
  currentStep: "select-theme"
}
```

### 2. SMART目標データ（修正後）
```
users/{userId}/smart-goals/{goalId}
{
  id: "goal_123",
  uid: "userId",
  themeId: "aspiration_session",
  themeTitle: "英語力を向上させたい",
  userType: "aspiration",
  specificDescription: "TOEICで800点を取得し...",
  measurementValue: 800,
  measurementUnit: "点",
  measurementFrequency: "毎月",
  relevanceReason: "キャリアアップして...",
  relatedValues: ["成長", "キャリア"],
  targetDate: Timestamp,
  milestones: [...],
  status: "active",
  progress: 0,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 3. PDCAデータ（現在の構造）
```
users/{userId}/pdca/{date}
{
  date: "2025-10-09",
  plan: "今日の目標",
  do: "今日の行動",
  check: "振り返り",
  action: "改善"
}
```

## 問題点の分析

### 🔴 問題1: テーマとPDCAの関連付けがない

**現在の問題:**
- PDCAデータには「どのテーマに対するPDCAか」の情報がない
- PDCAは日付ごとに1つしか作成できない
- 複数のテーマを同時進行できない

**影響:**
- ユーザーが「英語学習」と「健康管理」の2つのテーマで進めたい場合、混在してしまう
- テーマを変更すると、以前のPDCAデータとの関連が失われる

### 🔴 問題2: 1テーマ = 1目標の制限

**現在の構造:**
- `selectedTheme`は1つのテーマIDのみ
- 1つのテーマに対して複数の目標を設定できない

**影響:**
- 「英語力向上」というテーマに対して、「TOEIC800点」と「英会話スキル向上」の2つの目標を設定できない

## 推奨する改善案

### 案A: テーマベースの階層構造（推奨）

```
users/{userId}/
  ├─ theme-selection/
  │   └─ aspiration_session
  │       └─ {selectedTheme: "entry_1", entries: [...]}
  │
  ├─ themes/  ← 新規追加
  │   ├─ {themeId_1}/
  │   │   ├─ info
  │   │   │   └─ {themeTitle: "英語力を向上させたい", ...}
  │   │   ├─ smart-goals/
  │   │   │   ├─ {goalId_1}
  │   │   │   └─ {goalId_2}
  │   │   └─ pdca/
  │   │       ├─ 2025-10-09
  │   │       └─ 2025-10-10
  │   │
  │   └─ {themeId_2}/
  │       ├─ info
  │       ├─ smart-goals/
  │       └─ pdca/
```

**メリット:**
- テーマごとにPDCAを分離管理
- 1テーマに複数の目標を設定可能
- データの整合性が高い

**デメリット:**
- データ構造の大幅な変更が必要
- 既存データの移行が必要

### 案B: PDCAにテーマIDを追加（簡易版）

```
users/{userId}/pdca/{date}_{themeId}
{
  date: "2025-10-09",
  themeId: "entry_1",
  themeTitle: "英語力を向上させたい",
  goalId: "goal_123",  ← 関連する目標ID
  plan: "今日の目標",
  do: "今日の行動",
  check: "振り返り",
  action: "改善"
}
```

**メリット:**
- 既存構造への影響が少ない
- 実装が比較的容易

**デメリット:**
- 同じ日に複数テーマのPDCAを作成すると、データキーが複雑になる
- クエリが複雑になる可能性

### 案C: 現在の構造を維持（最小限の変更）

```
users/{userId}/
  ├─ smart-goals/{goalId}
  │   └─ {themeId: "entry_1", ...}  ← 既存
  │
  └─ pdca/{date}
      └─ {
          activeGoalId: "goal_123",  ← 追加
          activeThemeId: "entry_1",   ← 追加
          plan: "...",
          do: "...",
          check: "...",
          action: "..."
        }
```

**メリット:**
- 最小限の変更で対応可能
- 既存データへの影響が最も少ない

**デメリット:**
- 同時に複数テーマを進行できない
- 柔軟性が低い

## 推奨対応

私からは**案B（PDCAにテーマIDを追加）**を推奨します。

理由：
1. 既存構造への影響が比較的少ない
2. テーマごとのPDCA管理が可能
3. 将来的に案Aに移行しやすい
4. 実装コストと効果のバランスが良い

## 実装内容（案Bの場合）

### 必要な修正:

1. **PDCAデータ型の拡張**
2. **usePDCAフックの修正**
3. **PDCA作成時にテーマID・目標IDを関連付け**
4. **テーマ選択変更時の確認ダイアログ**

実装しますか？

