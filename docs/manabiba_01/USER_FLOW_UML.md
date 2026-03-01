# ユーザーフロー（UML図）

## 📋 ドキュメント情報

| 項目 | 内容 |
|------|------|
| **文書名** | ユーザーフロー（UML図） |
| **バージョン** | 1.1.2 |
| **作成日** | 2024年12月27日 |
| **最終更新日** | 2025年12月27日 |

---

## 1. 全体フロー

### 1.1 メインフロー

```plantuml
@startuml
title 人生学び場 こころ道場 - メインフロー

start
:ランディングページ表示;
if (ログイン済み?) then (yes)
  :マイページへリダイレクト;
else (no)
  :ログインページ表示;
  :Google認証;
  if (認証成功?) then (yes)
    if (プロファイル存在?) then (yes)
      :そのまま;
    else (no)
      :プロファイル作成;
    endif
    :マイページ表示;
  else (no)
    :エラー表示;
    stop
  endif
endif

:マイページ;
:進捗状況確認;
if (未開始?) then (yes)
  :自己理解ワーク;
elseif (リストアップ済み?) then (yes)
  :テーマ選択;
elseif (テーマ選択済み?) then (yes)
  :目標設定;
elseif (目標設定済み?) then (yes)
  :PDCAサイクル;
else (その他)
  :マイページ表示;
endif

stop
@enduml
```

---

## 2. 認証フロー

### 2.1 ログインフロー

```plantuml
@startuml
title ログインフロー

actor ユーザー
participant ランディングページ
participant ログインページ
participant Firebase認証
participant AuthContext
participant マイページ

ユーザー -> ランディングページ: アクセス
ランディングページ -> ユーザー: ランディングページ表示

alt 未ログイン
  ユーザー -> ランディングページ: 「ログイン」クリック
  ランディングページ -> ログインページ: 遷移
  ユーザー -> ログインページ: 「Googleでログイン」クリック
  ログインページ -> Firebase認証: Google Sign-In
   Firebase認証 -> ログインページ: 認証結果
  ログインページ -> AuthContext: 認証状態更新
   AuthContext -> マイページ: リダイレクト
else ログイン済み
  ランディングページ -> マイページ: 自動リダイレクト
end

マイページ -> ユーザー: マイページ表示
@enduml
```

---

## 3. 自己理解フロー

### 3.1 自己理解ワークフロー

```plantuml
@startuml
title 自己理解ワークフロー

actor ユーザー
participant マイページ
participant SelfUnderstanding
participant Firestore

ユーザー -> マイページ: 「自己理解」タブ選択
マイページ -> SelfUnderstanding: 表示

alt 願望リストアップ
  ユーザー -> SelfUnderstanding: 願望を入力
  SelfUnderstanding -> Firestore: 保存
  Firestore -> SelfUnderstanding: 保存完了
else 課題リストアップ
  ユーザー -> SelfUnderstanding: 課題を入力
  SelfUnderstanding -> Firestore: 保存
  Firestore -> SelfUnderstanding: 保存完了
else 価値観整理
  ユーザー -> SelfUnderstanding: 価値観を入力
  SelfUnderstanding -> Firestore: 保存
  Firestore -> SelfUnderstanding: 保存完了
else リソース整理
  ユーザー -> SelfUnderstanding: リソースを入力
  SelfUnderstanding -> Firestore: 保存
  Firestore -> SelfUnderstanding: 保存完了
end

SelfUnderstanding -> ユーザー: 入力完了表示
@enduml
```

---

## 4. テーマ選択フロー

### 4.1 テーマ選択プロセス

```plantuml
@startuml
title テーマ選択フロー

actor ユーザー
participant マイページ
participant ThemeSelection
participant ThemeEvaluator
participant Firestore

ユーザー -> マイページ: 「テーマ選択」開始
マイページ -> ThemeSelection: 表示

alt ユーザータイプ選択
  ユーザー -> ThemeSelection: 願望実現型 or 課題解決型を選択
  ThemeSelection -> Firestore: 保存
else リストアップ
  ユーザー -> ThemeSelection: 項目をリストアップ
  ThemeSelection -> Firestore: 自動保存（暗号化）
else 評価
  ユーザー -> ThemeEvaluator: 各項目を評価
  ThemeEvaluator -> Firestore: 評価結果保存
else テーマ選択
  ユーザー -> ThemeSelection: テーマを選択
  ThemeSelection -> Firestore: 選択結果保存
  ThemeSelection -> マイページ: 目標設定へ遷移
end
@enduml
```

---

## 5. 目標設定フロー

### 5.1 SMART目標設定フロー

```plantuml
@startuml
title SMART目標設定フロー

actor ユーザー
participant GoalSettingSMART
participant Firestore

ユーザー -> GoalSettingSMART: 目標設定開始

== S: 具体的 ==
ユーザー -> GoalSettingSMART: 具体的な目標を入力（最低20文字）
GoalSettingSMART -> Firestore: 自動保存（2秒debounce）

== M: 測定可能 ==
ユーザー -> GoalSettingSMART: 測定値、単位、頻度を設定
GoalSettingSMART -> Firestore: 自動保存

== R: 関連性 ==
ユーザー -> GoalSettingSMART: 重要性、価値観との関連を記述
GoalSettingSMART -> Firestore: 自動保存

== T: 期限設定 ==
ユーザー -> GoalSettingSMART: 達成期限とマイルストーンを設定
GoalSettingSMART -> Firestore: 自動保存

== 確認 ==
ユーザー -> GoalSettingSMART: 設定内容を確認
ユーザー -> GoalSettingSMART: 「目標を設定する」クリック
GoalSettingSMART -> Firestore: 確定保存（status: active）
GoalSettingSMART -> ユーザー: 完了表示
@enduml
```

---

## 6. PDCAサイクルフロー

### 6.1 PDCA入力フロー

```plantuml
@startuml
title PDCA入力フロー

actor ユーザー
participant マイページ
participant Calendar
participant PDCAInputModal
participant Firestore

ユーザー -> マイページ: マイページ表示
マイページ -> Calendar: カレンダー表示

alt 日付選択
  ユーザー -> Calendar: 日付をクリック
  Calendar -> マイページ: 日付選択イベント
  マイページ -> PDCAInputModal: モーダル表示
else 今日の日付
  マイページ -> Calendar: 今日の日付を表示
end

alt Plan入力
  ユーザー -> PDCAInputModal: Planを入力
  PDCAInputModal -> Firestore: 保存
else Do入力
  ユーザー -> PDCAInputModal: Doを入力
  PDCAInputModal -> Firestore: 保存
else Check入力
  ユーザー -> PDCAInputModal: Checkを入力
  PDCAInputModal -> Firestore: 保存
else Action入力
  ユーザー -> PDCAInputModal: Actionを入力
  PDCAInputModal -> Firestore: 保存
end

PDCAInputModal -> マイページ: 保存完了通知
マイページ -> Calendar: カレンダー更新
@enduml
```

---

## 7. 画面遷移図

### 7.1 主要画面遷移

```plantuml
@startuml
title 主要画面遷移図

[*] --> ランディングページ : アクセス

state ランディングページ {
  [*] --> ログインボタン表示
}

ランディングページ --> ログインページ : [ログイン] クリック

state ログインページ {
  [*] --> Google認証
  Google認証 --> 認証成功 : 認証OK
  Google認証 --> 認証失敗 : 認証NG
  認証失敗 --> [*]
}

ログインページ --> マイページ : [認証成功]

state マイページ {
  [*] --> ホームタブ
  ホームタブ --> 自己理解タブ : タブ切り替え
  自己理解タブ --> テーマ選択タブ : タブ切り替え
  テーマ選択タブ --> 目標設定タブ : タブ切り替え
  目標設定タブ --> PDCA分析タブ : タブ切り替え
  PDCA分析タブ --> 振り返りタブ : タブ切り替え
  振り返りタブ --> ホームタブ : タブ切り替え
}

マイページ --> チャートデモ : [チャートデモ] リンク
マイページ --> タイムラインデモ : [タイムラインデモ] リンク
マイページ --> ダイアグラム : [ダイアグラム] リンク
マイページ --> LifeDesignMandala : [Life Design Mandala] リンク

state チャートデモ {
  [*] --> チャート表示
}

state タイムラインデモ {
  [*] --> タイムライン表示
}

state ダイアグラム {
  [*] --> ダイアグラム表示
}

state LifeDesignMandala {
  [*] --> 曼荼羅表示
}

チャートデモ --> マイページ : [戻る]
タイムラインデモ --> マイページ : [戻る]
ダイアグラム --> マイページ : [戻る]
LifeDesignMandala --> マイページ : [戻る]

マイページ --> [*] : ログアウト

@enduml
```

---

## 8. エラーフロー

### 8.1 エラーハンドリング

```plantuml
@startuml
title エラーハンドリングフロー

start
:操作実行;

if (認証エラー?) then (yes)
  :ログインページへリダイレクト;
  stop
elseif (データ取得エラー?) then (yes)
  :エラーメッセージ表示;
  :再試行ボタン表示;
elseif (保存エラー?) then (yes)
  :エラーメッセージ表示;
  :データはローカルに保持;
  :再試行可能;
elseif (ネットワークエラー?) then (yes)
  :オフラインモード表示;
  :データはローカルに保持;
else (該当なし)
  :継続;
endif

stop
@enduml
```

---

## 9. 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.1.2 | 2025-12-27 | シーケンス図の`endif`を`end`に修正（2.1、3.1、4.1、6.1）、1.1メインフローの進捗状況確認の条件式を修正 |
| 1.1.1 | 2025-12-27 | 1.1メインフロー・8.1エラーハンドリングのPlantUML構文修正（`else`→`elseif`、`if`/`then`にラベル追加、`alt`→`if`） |
| 1.1.0 | 2025-12-27 | 7.1主要画面遷移図をPlantUMLステート図に変換、ファイル名をUSER_FLOW_UML.mdに変更 |
| 1.0.0 | 2024-12-27 | 初版作成 |
