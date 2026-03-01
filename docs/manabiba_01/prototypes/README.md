# プロトタイプ

このディレクトリには、UI/UX設計書で参照するプロトタイプファイルを配置します。

## ディレクトリ構成

```
prototypes/
├── wireframes/       # ワイヤーフレーム
├── mockups/          # モックアップ
└── interactive/      # インタラクティブプロトタイプ（HTML/CSS/JS）
    ├── css/
    │   └── prototype-common.css   # 共通スタイル（DESIGN_SYSTEM準拠）
    ├── index.html                 # プロトタイプ一覧
    ├── prototype_SCREEN-000_homepage_v1.0.html
    ├── prototype_SCREEN-001_landing_v1.0.html
    ├── prototype_SCREEN-002_login_v1.0.html
    └── prototype_SCREEN-003_mypage_v1.0.html
```

## 命名規則

### ワイヤーフレーム
- `wireframe_[画面ID]_[画面名]_v[バージョン].[拡張子]`
- **例**: `wireframe_SCREEN-001_landing_v1.0.figma`

### モックアップ
- `mockup_[画面ID]_[画面名]_v[バージョン].[拡張子]`
- **例**: `mockup_SCREEN-001_landing_v1.0.figma`

### インタラクティブプロトタイプ（HTML/CSS/JS）
- `prototype_[画面ID]_[画面名]_v[バージョン].[拡張子]`
- **例**: `prototype_SCREEN-001_landing_v1.0.html`
- **共通**: `css/prototype-common.css`（DESIGN_SYSTEM準拠）、`index.html`（一覧）
- **確認**: ブラウザで `interactive/index.html` または各HTMLを直接開く

## 画面ID一覧

| 画面ID | 画面名 |
|--------|--------|
| SCREEN-000 | ホームページ |
| SCREEN-001 | ランディングページ |
| SCREEN-002 | ログインページ |
| SCREEN-003 | マイページ（ホーム） |
| SCREEN-004 | 28日間トライアル（アファメーション） |
| SCREEN-005 | 28日間トライアル（朝・晩） |
| SCREEN-006 | 28日間トライアル（週） |
| SCREEN-007 | 28日間トライアル（月） |
| SCREEN-008 | 振り返り |
| SCREEN-009 | コーチングプログラム |

### 28日間トライアル画面の共通仕様（確定・実装時準拠）

- **メインコンテンツ幅（trial-main）**: 最大幅 **1026px**（ホームの content-left と同一）
- **サイドバー「ホーム」**: ホーム画面のURLへ遷移。**プロトタイプ**では認証がないため `?logged_in=true` でログイン表示を模擬。**実装**ではリンク先はホームのURLのみとし、ログイン状態の表示はホーム側で認証状態（AuthContext 等）を参照して判定する。

詳細は [要件定義書](../REQUIREMENTS_SPECIFICATION.md) 2.8.3、[UI/UX設計書](../UI_UX_DESIGN.md) 5.10.4、[デザインシステム](../DESIGN_SYSTEM.md) 3.3.5 を参照。

## 更新ルール

- **バージョン管理**: Gitで管理（可能な限り）
- **バージョン番号**: UI/UX設計書のバージョンと連動
- **更新タイミング**: 
  - ワイヤーフレーム: 画面設計の初期段階
  - モックアップ: デザイン確定時
  - インタラクティブプロトタイプ: インタラクション確認時

## 関連ドキュメント

- [UI/UX設計書](../UI_UX_DESIGN.md)
- [デザインシステム](../DESIGN_SYSTEM.md)
- [プロトタイプ機能追加ガイドライン](./PROTOTYPE_GUIDELINES.md) - **プロトタイプ段階で追加・修正できる機能の範囲を定義**
