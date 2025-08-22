import {
  generateUserKey,
  generateSalt,
  encryptData,
  decryptData,
  verifyEncryptionKey,
  validateEncryptedData,
} from './encryption';

// 動作確認用のデモ関数
export const runEncryptionDemo = async () => {
  console.log('=== 暗号化機能デモ開始 ===');
  
  try {
    // テストデータ
    const testPassword = 'testPassword123';
    const testData = 'これはテストデータです。機密情報を含んでいます。';
    
    console.log('1. ソルト生成テスト');
    const salt = generateSalt();
    console.log('生成されたソルト:', salt);
    
    console.log('\n2. ユーザーキー生成テスト');
    const userKey = await generateUserKey(testPassword, salt);
    console.log('生成されたキー:', userKey.substring(0, 20) + '...');
    
    console.log('\n3. データ暗号化テスト');
    const encrypted = encryptData(testData, userKey);
    console.log('暗号化されたデータ:', {
      encryptedContent: encrypted.encryptedContent.substring(0, 50) + '...',
      iv: encrypted.iv,
      salt: encrypted.salt,
      version: encrypted.version,
      createdAt: encrypted.createdAt,
    });
    
    console.log('\n4. データ復号化テスト');
    const decrypted = decryptData(encrypted, userKey);
    console.log('復号化されたデータ:', decrypted);
    console.log('元データと一致:', decrypted === testData);
    
    console.log('\n5. キー検証テスト');
    const isValid = verifyEncryptionKey(encrypted, userKey);
    console.log('キー検証結果:', isValid);
    
    console.log('\n6. データ整合性チェックテスト');
    const isDataValid = validateEncryptedData(encrypted);
    console.log('データ整合性:', isDataValid);
    
    console.log('\n7. 異なるキーでの復号化テスト');
    const wrongSalt = generateSalt();
    const wrongKey = await generateUserKey(testPassword, wrongSalt);
    try {
      decryptData(encrypted, wrongKey);
      console.log('❌ エラー: 異なるキーでも復号化できてしまいました');
    } catch (error) {
      console.log('✅ 正常: 異なるキーでは復号化できません');
    }
    
    console.log('\n=== 暗号化機能デモ完了 ===');
    return true;
    
  } catch (error) {
    console.error('デモ実行中にエラーが発生しました:', error);
    return false;
  }
};

// パフォーマンステスト
export const runPerformanceTest = async () => {
  console.log('\n=== パフォーマンステスト開始 ===');
  
  const testPassword = 'testPassword123';
  const testData = 'これはパフォーマンステスト用のデータです。'.repeat(100);
  const iterations = 100;
  
  const startTime = Date.now();
  
  for (let i = 0; i < iterations; i++) {
    const salt = generateSalt();
    const userKey = await generateUserKey(testPassword, salt);
    const encrypted = encryptData(testData, userKey);
    const decrypted = decryptData(encrypted, userKey);
    
    if (decrypted !== testData) {
      console.error(`❌ 反復 ${i + 1} でデータの整合性エラー`);
      return false;
    }
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;
  
  console.log(`✅ ${iterations}回の暗号化・復号化を ${totalTime}ms で完了`);
  console.log(`平均処理時間: ${avgTime.toFixed(2)}ms`);
  
  return true;
};
