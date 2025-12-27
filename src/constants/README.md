# Constants Directory

このディレクトリには、プロジェクト全体で使用される定数やレギュレーションが含まれています。

## ファイル一覧

### DataAttributesRegulation.ts
データ属性の命名規則を定義したレギュレーションファイルです。

#### 主な機能
- **階層構造属性**: アプリケーション全体の階層構造を表現
- **コンポーネント識別属性**: 機能別コンポーネント識別
- **レスポンシブ属性**: デバイス別表示制御
- **レイアウト属性**: レイアウトパターン識別
- **状態属性**: コンポーネントの状態管理
- **機能属性**: 機能別識別
- **インタラクション属性**: ユーザーインタラクション
- **コンテンツ属性**: コンテンツタイプ識別

#### 使用方法
```typescript
import { 
  HIERARCHY_ATTRIBUTES, 
  COMPONENT_ATTRIBUTES,
  createDataAttributes 
} from '@/constants/DataAttributesRegulation';

// 基本的な使用方法
const headerAttrs = createDataAttributes({
  'data-hierarchy': HIERARCHY_ATTRIBUTES.APP_HEADER,
  'data-component': COMPONENT_ATTRIBUTES.HEADER,
  'data-responsive': RESPONSIVE_ATTRIBUTES.ALL_DEVICES,
});

// JSXでの使用
<div {...headerAttrs} className="...">
  {/* コンテンツ */}
</div>
```

#### ヘルパー関数
- `createDataAttributes()`: データ属性オブジェクトを生成
- `createHierarchyAttributes()`: 階層構造属性を生成
- `createResponsiveAttributes()`: レスポンシブ属性を生成
- `createStateAttributes()`: 状態属性を生成

## 命名規則ガイドライン

### 1. 階層構造 (data-hierarchy)
- アプリケーション全体: `"app-[section]"`
- コンポーネント内: `"component-[name]"`

### 2. コンポーネント (data-component)
- ケバブケース: `"video-zoom-toggle"`
- 機能名を明確に: `"support-slide-bar"`

### 3. レスポンシブ (data-responsive)
- デバイス範囲: `"mobile-only"`, `"tablet-laptop"`
- 全デバイス: `"all"`

### 4. レイアウト (data-layout)
- パターン名: `"fixed-header"`, `"sidebar-overlay"`
- CSSクラスに対応: `"flex-container"`

### 5. 状態 (data-state)
- 現在の状態: `"expanded"`, `"collapsed"`
- 対になる状態を定義: `"open/closed"`

### 6. 機能 (data-function)
- 機能名: `"navigation"`, `"video-player"`
- ユーザーアクション: `"user-menu"`

### 7. インタラクション (data-interaction)
- 操作可能な要素: `"clickable"`, `"swipeable"`
- ユーザー操作: `"toggleable"`

### 8. コンテンツ (data-content)
- コンテンツタイプ: `"video-thumbnail"`
- 構造要素: `"header-container"`

## 注意事項

- データ属性は一貫性を保つため、このレギュレーションファイルで定義された値のみを使用してください
- 新しい属性が必要な場合は、まずこのファイルに追加してから使用してください
- 属性名はケバブケース（kebab-case）を使用してください
- 状態属性は対になる値（例: open/closed）を必ず定義してください
