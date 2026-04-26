# 人生学び場 こころ道場 - 設計書

## ファイル名の規約（層別接頭語）

| 接頭語 | 層 | 内容の目安 |
|--------|----|------------|
| `00_` | 第0層 | このフォルダの入口・索引（本ファイル） |
| `01_` | 第1層 | プロダクト（要件・UI/UX・機能一覧・ロール/サブスク） |
| `02_` | 第2層 | アーキテクチャ・デザインシステム |
| `03_` | 第3層 | データ・権限・コーチ共有・日誌×コーチ/AI |
| `04_` | 第4層 | 実装手順・決定ログ・画面別実装・個別提案 |
| `05_` | 第5層 | 歴史・ナビ/ワークフロー提案・UML（参照用） |

※ `README.md`（本ファイルの1つ上）は、GitHub 等でフォルダを開いたときの案内用です。詳細は **00_README.md** を正とします。

## 📋 ドキュメント一覧

このフォルダには、リバースエンジニアリングにより作成された設計書が含まれています。

### 主要ドキュメント

1. **[要件定義書](./01_REQUIREMENTS_SPECIFICATION.md)**
   - システムの目的と要件
   - 機能要件・非機能要件
   - ユーザーストーリー
   - データモデル
   - 技術スタック

2. **[システムアーキテクチャ設計書](./02_SYSTEM_ARCHITECTURE.md)**
   - システム構成
   - アーキテクチャパターン
   - データフロー
   - セキュリティアーキテクチャ
   - 状態管理

3. **[機能一覧](./01_FEATURE_LIST.md)**
   - 全機能の一覧
   - 実装状況
   - 優先度別集計

4. **[アファメーション設計](./04_AFFIRMATION_DESIGN.md)**（28日間トライアル・COACHPROG-005）
   - プロファイル・穴埋め・`[[slotId:n]]` Markdown・保存パス・UI（選択/作成/編集/履歴）・権限・暗号化

5. **[A-11 コーチ共有データ構造（現状案）](./03_A11_COACH_SHARING_SCHEMA_DRAFT.md)**
   - 割当 `coach_client_assignments`、共有メタ・`coach_share_rounds` / `coach_comment_versions`、フィールド名クイックリファレンス（[04_TRIAL_28_IMPLEMENTATION_DECISIONS.md](./04_TRIAL_28_IMPLEMENTATION_DECISIONS.md) A-11 と同期）

6. **Vertex AI（トライアル「Aiコーチからのコメント」）開発者向け** — [../VERTEX_AI_TRIAL_IMPROVEMENT.md](../VERTEX_AI_TRIAL_IMPROVEMENT.md)（`docs/` 直下。GCP 設定・環境変数・REST 仕様・トラブルシュート）

### 同梱ファイル一覧（層別・接頭語）

- **第0層**: [00_README.md](./00_README.md)、[README.md](./README.md)（入口案内のみ）
- **第1層**: [01_REQUIREMENTS_SPECIFICATION.md](./01_REQUIREMENTS_SPECIFICATION.md)、[01_UI_UX_DESIGN.md](./01_UI_UX_DESIGN.md)、[01_FEATURE_LIST.md](./01_FEATURE_LIST.md)、[01_ROLES_AND_SUBSCRIPTION_DESIGN.md](./01_ROLES_AND_SUBSCRIPTION_DESIGN.md)
- **第2層**: [02_SYSTEM_ARCHITECTURE.md](./02_SYSTEM_ARCHITECTURE.md)、[02_DESIGN_SYSTEM.md](./02_DESIGN_SYSTEM.md)
- **第3層**: [03_FIRESTORE_DATABASE_STRUCTURE.md](./03_FIRESTORE_DATABASE_STRUCTURE.md)、[03_A11_COACH_SHARING_SCHEMA_DRAFT.md](./03_A11_COACH_SHARING_SCHEMA_DRAFT.md)、[03_JOURNAL_COACH_AI_PLANS_AND_CAPABILITIES.md](./03_JOURNAL_COACH_AI_PLANS_AND_CAPABILITIES.md)
- **第4層**: [04_TRIAL_28_IMPLEMENTATION_DECISIONS.md](./04_TRIAL_28_IMPLEMENTATION_DECISIONS.md)、[04_IMPLEMENTATION_STEPS_DB_AND_AUTH.md](./04_IMPLEMENTATION_STEPS_DB_AND_AUTH.md)、[04_IMPLEMENTATION_STEPS_HOME_AND_TRIAL.md](./04_IMPLEMENTATION_STEPS_HOME_AND_TRIAL.md)、[04_HOME_SCREEN_IMPLEMENTATION.md](./04_HOME_SCREEN_IMPLEMENTATION.md)、[04_YOUTUBE_VIDEO_IMPORT_PROPOSAL.md](./04_YOUTUBE_VIDEO_IMPORT_PROPOSAL.md)、[04_AFFIRMATION_DESIGN.md](./04_AFFIRMATION_DESIGN.md)
- **第5層**: [05_NAVIGATION_PROPOSAL.md](./05_NAVIGATION_PROPOSAL.md)、[05_WORKFLOW_PROPOSAL.md](./05_WORKFLOW_PROPOSAL.md)、[05_USER_FLOW_UML.md](./05_USER_FLOW_UML.md)

（`prototypes/`、`paper_based_tools/` は従来どおりサブフォルダ配下。）

### ドキュメントの関係性

```
要件定義書
    ↓
システムアーキテクチャ設計書
    ↓
機能一覧
```

### 作成方法

これらのドキュメントは、既存のコードベースを分析（リバースエンジニアリング）して作成されました。

**分析対象**:
- ソースコード（`src/`）
- 型定義（`src/types/`）
- フック（`src/hooks/`）
- コンポーネント（`src/components/`）
- 既存のダイアグラム（`documents/diagrams/`）

### 使用方法

1. **要件定義書**: システムの全体像を把握
2. **システムアーキテクチャ設計書**: 技術的な詳細を理解
3. **機能一覧**: 実装済み機能を確認

### 更新履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-04-10 | 設計書ファイルに層別接頭語（`00_`〜`05_`）を付与。索引は **00_README.md**、フォルダ入口は **README.md** |
| 2026-03-28 | 03_A11_COACH_SHARING_SCHEMA_DRAFT.md を主要ドキュメント一覧に追加 |
| 2026-03-02 | アファメーション設計書（04_AFFIRMATION_DESIGN.md）を主要ドキュメント一覧に追加 |
| 2024-12-27 | 初版作成（リバースエンジニアリング） |

---

**次のステップ**: これらの設計書を基に、外部仕様書の作成を進めましょう。

