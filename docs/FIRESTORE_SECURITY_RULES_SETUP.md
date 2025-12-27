# Firestore セキュリティルール設定ガイド

## 🔒 問題の概要

Firebase Firestoreがテストモードで作成され、30日後に自動的にアクセスが拒否されるようになりました。
適切なセキュリティルールを設定して、アプリケーションを復旧させましょう。

## 📋 設定手順

### 方法1: Firebaseコンソールから直接設定（推奨）

1. **Firebaseコンソールにアクセス**
   - https://console.firebase.google.com/ にアクセス
   - プロジェクト `plandosee-project-01` を選択

2. **Firestore Databaseに移動**
   - 左メニューから「Firestore Database」をクリック
   - 「ルール」タブをクリック

3. **セキュリティルールを貼り付け**
   - エディタに以下のルールをコピー＆ペースト：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ヘルパー関数: 認証済みユーザーのチェック
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // ヘルパー関数: 自分のデータかチェック
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // ユーザープロファイル
    match /users/{userId} {
      // 読み取り: 自分のプロファイルのみ
      allow read: if isOwner(userId);
      
      // 作成: 自分のプロファイルのみ
      allow create: if isOwner(userId);
      
      // 更新: 自分のプロファイルのみ
      allow update: if isOwner(userId);
      
      // 削除: 自分のプロファイルのみ
      allow delete: if isOwner(userId);
      
      // SMART目標（サブコレクション）
      match /smart-goals/{goalId} {
        // 読み取り: 自分の目標のみ
        allow read: if isOwner(userId);
        
        // 作成: 自分の目標のみ
        allow create: if isOwner(userId) && 
          request.resource.data.uid == userId;
        
        // 更新: 自分の目標のみ
        allow update: if isOwner(userId) && 
          resource.data.uid == userId;
        
        // 削除: 自分の目標のみ
        allow delete: if isOwner(userId) && 
          resource.data.uid == userId;
      }
    }
    
    // PDCAエントリ
    match /pdca_entries/{entryId} {
      // 読み取り: 自分のエントリのみ
      allow read: if isAuthenticated() && 
        resource.data.uid == request.auth.uid;
      
      // 作成: 自分のエントリのみ
      allow create: if isAuthenticated() && 
        request.resource.data.uid == request.auth.uid;
      
      // 更新: 自分のエントリのみ
      allow update: if isAuthenticated() && 
        resource.data.uid == request.auth.uid;
      
      // 削除: 自分のエントリのみ
      allow delete: if isAuthenticated() && 
        resource.data.uid == request.auth.uid;
    }
    
    // PDCA集約データ
    match /pdca_aggregations/{aggregationId} {
      // 読み取り: 自分の集約データのみ
      allow read: if isAuthenticated() && 
        resource.data.uid == request.auth.uid;
      
      // 作成: 自分の集約データのみ
      allow create: if isAuthenticated() && 
        request.resource.data.uid == request.auth.uid;
      
      // 更新: 自分の集約データのみ
      allow update: if isAuthenticated() && 
        resource.data.uid == request.auth.uid;
      
      // 削除: 自分の集約データのみ
      allow delete: if isAuthenticated() && 
        resource.data.uid == request.auth.uid;
    }
    
    // コーチングセッション
    match /coaching_sessions/{sessionId} {
      // 読み取り: 自分のセッションのみ
      allow read: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
      
      // 作成: 自分のセッションのみ
      allow create: if isAuthenticated() && 
        request.resource.data.userId == request.auth.uid;
      
      // 更新: 自分のセッションのみ
      allow update: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
      
      // 削除: 自分のセッションのみ
      allow delete: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
    }
    
    // 目標（goalsコレクション）
    match /goals/{goalId} {
      // 読み取り: 自分の目標のみ
      allow read: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
      
      // 作成: 自分の目標のみ
      allow create: if isAuthenticated() && 
        request.resource.data.userId == request.auth.uid;
      
      // 更新: 自分の目標のみ
      allow update: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
      
      // 削除: 自分の目標のみ
      allow delete: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
    }
    
    // AI分析
    match /ai_analyses/{analysisId} {
      // 読み取り: 自分の分析のみ
      allow read: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
      
      // 作成: 自分の分析のみ
      allow create: if isAuthenticated() && 
        request.resource.data.userId == request.auth.uid;
      
      // 更新: 自分の分析のみ
      allow update: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
      
      // 削除: 自分の分析のみ
      allow delete: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
    }
    
    // コーチング設定
    match /coaching_settings/{userId} {
      // 読み取り: 自分の設定のみ
      allow read: if isOwner(userId);
      
      // 作成: 自分の設定のみ
      allow create: if isOwner(userId) && 
        request.resource.data.userId == userId;
      
      // 更新: 自分の設定のみ
      allow update: if isOwner(userId) && 
        resource.data.userId == userId;
      
      // 削除: 自分の設定のみ
      allow delete: if isOwner(userId);
    }
  }
}
```

4. **ルールを公開**
   - 「公開」ボタンをクリック
   - 確認ダイアログで「公開」をクリック

5. **確認**
   - ルールが正常に公開されたことを確認
   - 数分待ってからアプリケーションをテスト

### 方法2: Firebase CLIを使用（オプション）

もしFirebase CLIがインストールされている場合：

```bash
# Firebase CLIでログイン
firebase login

# プロジェクトを選択
firebase use plandosee-project-01

# ルールをデプロイ
firebase deploy --only firestore:rules
```

## ✅ セキュリティルールの説明

### 基本原則

1. **認証必須**: すべての操作で認証が必要
2. **所有権チェック**: ユーザーは自分のデータのみアクセス可能
3. **データ整合性**: 作成・更新時にuidが一致することを確認

### 保護されているコレクション

- `users/{userId}` - ユーザープロファイル
- `users/{userId}/smart-goals/{goalId}` - SMART目標（サブコレクション）
- `pdca_entries/{entryId}` - PDCAエントリ
- `pdca_aggregations/{aggregationId}` - PDCA集約データ
- `coaching_sessions/{sessionId}` - コーチングセッション
- `goals/{goalId}` - 目標
- `ai_analyses/{analysisId}` - AI分析
- `coaching_settings/{userId}` - コーチング設定

## 🔍 トラブルシューティング

### ルールが反映されない場合

1. **時間を待つ**: ルールの反映には最大24時間かかる場合があります
2. **ブラウザキャッシュをクリア**: キャッシュをクリアして再試行
3. **ルールの構文を確認**: Firebaseコンソールの「ルールの検証」機能を使用

### エラーが発生する場合

- **Permission denied**: 認証されていない、または自分のデータでない可能性
- **Missing or insufficient permissions**: ルールが正しく設定されていない可能性

## 📝 注意事項

- **本番環境では必ず適切なルールを設定**: テストモードは開発時のみ使用
- **定期的なルールの見直し**: セキュリティ要件の変更に応じて更新
- **ルールのテスト**: Firebaseコンソールの「ルールの検証」機能でテスト可能

## 🎯 次のステップ

1. ルールを設定後、アプリケーションをテスト
2. すべての機能が正常に動作することを確認
3. 必要に応じてルールを調整

---

**作成日**: 2024年
**最終更新**: 2024年

