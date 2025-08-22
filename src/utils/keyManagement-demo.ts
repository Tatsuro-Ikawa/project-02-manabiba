import { keyManager, KeyManager } from './keyManagement';

// キー管理システムのデモ関数
export const runKeyManagementDemo = async () => {
  console.log('=== キー管理システムデモ開始 ===');
  
  try {
    const testUserId = 'test_user_123';
    const testPassword = 'testPassword123';
    
    console.log('1. ユーザーキーの初期化');
    const userKeyInfo = await keyManager.initializeUserKey(testUserId, testPassword);
    console.log('ユーザーキー情報:', {
      userId: userKeyInfo.userId,
      salt: userKeyInfo.salt,
      hasBackupKey: !!userKeyInfo.backupKey,
      createdAt: userKeyInfo.createdAt,
    });
    
    console.log('\n2. セッションキーの生成');
    const sessionInfo = await keyManager.generateSessionKey(testUserId, testPassword);
    console.log('セッション情報:', {
      sessionId: sessionInfo.sessionId,
      userId: sessionInfo.userId,
      expiresAt: sessionInfo.expiresAt,
      isActive: sessionInfo.isActive,
    });
    
    console.log('\n3. セッションキーの検証');
    const isValid = keyManager.validateSessionKey(sessionInfo.sessionId);
    console.log('セッション有効性:', isValid);
    
    console.log('\n4. セッションキーの取得');
    const sessionKey = keyManager.getSessionKey(sessionInfo.sessionId);
    console.log('セッションキー取得:', sessionKey ? '成功' : '失敗');
    
    console.log('\n5. アクティブセッション数の確認');
    const activeCount = keyManager.getActiveSessionCount();
    console.log('アクティブセッション数:', activeCount);
    
    console.log('\n6. キー復旧テスト');
    const recoveredKey = await keyManager.recoverUserKey(testUserId, testPassword);
    console.log('キー復旧結果:', recoveredKey ? '成功' : '失敗');
    
    console.log('\n7. セッション無効化テスト');
    keyManager.invalidateSession(sessionInfo.sessionId);
    const isValidAfterInvalidation = keyManager.validateSessionKey(sessionInfo.sessionId);
    console.log('無効化後のセッション有効性:', isValidAfterInvalidation);
    
    console.log('\n8. 期限切れセッションのクリーンアップ');
    keyManager.cleanupExpiredSessions();
    const activeCountAfterCleanup = keyManager.getActiveSessionCount();
    console.log('クリーンアップ後のアクティブセッション数:', activeCountAfterCleanup);
    
    console.log('\n=== キー管理システムデモ完了 ===');
    return true;
    
  } catch (error) {
    console.error('デモ実行中にエラーが発生しました:', error);
    return false;
  }
};

// セッション管理の詳細テスト
export const runSessionManagementTest = async () => {
  console.log('\n=== セッション管理詳細テスト開始 ===');
  
  try {
    const testUserId = 'session_test_user';
    const testPassword = 'sessionTestPassword123';
    
    // ユーザーキーの初期化
    console.log('0. ユーザーキーの初期化');
    await keyManager.initializeUserKey(testUserId, testPassword);
    console.log('ユーザーキー初期化完了');
    
    // 複数のセッションを作成
    console.log('\n1. 複数セッションの作成');
    const session1 = await keyManager.generateSessionKey(testUserId, testPassword);
    const session2 = await keyManager.generateSessionKey(testUserId, testPassword);
    
    console.log('セッション1:', session1.sessionId);
    console.log('セッション2:', session2.sessionId);
    
    // セッション1が無効化されていることを確認（新しいセッション作成時に既存セッションが無効化される）
    console.log('\n2. 既存セッションの無効化確認');
    const session1Valid = keyManager.validateSessionKey(session1.sessionId);
    const session2Valid = keyManager.validateSessionKey(session2.sessionId);
    console.log('セッション1有効性:', session1Valid);
    console.log('セッション2有効性:', session2Valid);
    
    // ユーザーの全セッションを無効化
    console.log('\n3. ユーザー全セッションの無効化');
    keyManager.invalidateUserSessions(testUserId);
    const session2ValidAfterInvalidation = keyManager.validateSessionKey(session2.sessionId);
    console.log('無効化後のセッション2有効性:', session2ValidAfterInvalidation);
    
    console.log('\n=== セッション管理詳細テスト完了 ===');
    return true;
    
  } catch (error) {
    console.error('セッション管理テストでエラーが発生しました:', error);
    return false;
  }
};

// エラーハンドリングテスト
export const runErrorHandlingTest = async () => {
  console.log('\n=== エラーハンドリングテスト開始 ===');
  
  try {
    const testUserId = 'error_test_user';
    const testPassword = 'correctPassword123';
    const wrongPassword = 'wrongPassword';
    
    // 正しいユーザーキーを初期化
    console.log('0. 正しいユーザーキーの初期化');
    await keyManager.initializeUserKey(testUserId, testPassword);
    console.log('ユーザーキー初期化完了');
    
    console.log('\n1. 存在しないユーザーでのセッション生成');
    try {
      await keyManager.generateSessionKey('non_existent_user', wrongPassword);
      console.log('❌ エラー: 存在しないユーザーでもセッションが生成されてしまいました');
    } catch (error) {
      console.log('✅ 正常: 存在しないユーザーではセッション生成が失敗しました');
    }
    
    console.log('\n2. 間違ったパスワードでのセッション生成');
    try {
      await keyManager.generateSessionKey(testUserId, wrongPassword);
      console.log('❌ エラー: 間違ったパスワードでもセッションが生成されてしまいました');
    } catch (error) {
      console.log('✅ 正常: 間違ったパスワードではセッション生成が失敗しました');
    }
    
    console.log('\n3. 無効なセッションIDでの検証');
    const invalidSessionId = 'invalid_session_id';
    const isValid = keyManager.validateSessionKey(invalidSessionId);
    console.log('無効セッションIDの検証結果:', isValid);
    
    console.log('\n4. キー復旧テスト（間違ったパスワード）');
    const recoveredKey = await keyManager.recoverUserKey(testUserId, wrongPassword);
    console.log('間違ったパスワードでのキー復旧結果:', recoveredKey);
    
    console.log('\n=== エラーハンドリングテスト完了 ===');
    return true;
    
  } catch (error) {
    console.error('エラーハンドリングテストでエラーが発生しました:', error);
    return false;
  }
};
