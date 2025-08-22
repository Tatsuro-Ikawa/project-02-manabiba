import {
  generateUserKey,
  generateSalt,
  generateIV,
  encryptData,
  decryptData,
  verifyEncryptionKey,
  validateEncryptedData,
  EncryptedData,
} from '../encryption';

describe('暗号化ユーティリティ', () => {
  const testPassword = 'testPassword123';
  const testData = 'これはテストデータです。機密情報を含んでいます。';

  describe('generateUserKey', () => {
    it('同じパスワードとソルトで同じキーを生成する', async () => {
      const salt = generateSalt();
      const key1 = await generateUserKey(testPassword, salt);
      const key2 = await generateUserKey(testPassword, salt);
      
      expect(key1).toBe(key2);
    });

    it('異なるソルトで異なるキーを生成する', async () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      const key1 = await generateUserKey(testPassword, salt1);
      const key2 = await generateUserKey(testPassword, salt2);
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('generateSalt', () => {
    it('ランダムなソルトを生成する', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      
      expect(salt1).toBeDefined();
      expect(salt2).toBeDefined();
      expect(salt1).not.toBe(salt2);
      expect(salt1.length).toBeGreaterThan(0);
    });
  });

  describe('generateIV', () => {
    it('ランダムなIVを生成する', () => {
      const iv1 = generateIV();
      const iv2 = generateIV();
      
      expect(iv1).toBeDefined();
      expect(iv2).toBeDefined();
      expect(iv1).not.toBe(iv2);
      expect(iv1.length).toBeGreaterThan(0);
    });
  });

  describe('encryptData', () => {
    it('データを正常に暗号化する', () => {
      const salt = generateSalt();
      const key = generateUserKey(testPassword, salt);
      
      return key.then(userKey => {
        const encrypted = encryptData(testData, userKey);
        
        expect(encrypted).toBeDefined();
        expect(encrypted.encryptedContent).toBeDefined();
        expect(encrypted.iv).toBeDefined();
        expect(encrypted.salt).toBeDefined();
        expect(encrypted.version).toBe('1.0');
        expect(encrypted.createdAt).toBeInstanceOf(Date);
        expect(encrypted.encryptedContent).not.toBe(testData);
      });
    });

    it('同じデータでも異なる暗号化結果を生成する', () => {
      const salt = generateSalt();
      const key = generateUserKey(testPassword, salt);
      
      return key.then(userKey => {
        const encrypted1 = encryptData(testData, userKey);
        const encrypted2 = encryptData(testData, userKey);
        
        expect(encrypted1.encryptedContent).not.toBe(encrypted2.encryptedContent);
        expect(encrypted1.iv).not.toBe(encrypted2.iv);
        expect(encrypted1.salt).not.toBe(encrypted2.salt);
      });
    });
  });

  describe('decryptData', () => {
    it('暗号化されたデータを正常に復号化する', () => {
      const salt = generateSalt();
      const key = generateUserKey(testPassword, salt);
      
      return key.then(userKey => {
        const encrypted = encryptData(testData, userKey);
        const decrypted = decryptData(encrypted, userKey);
        
        expect(decrypted).toBe(testData);
      });
    });

    it('異なるキーでは復号化できない', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      const key1 = generateUserKey(testPassword, salt1);
      const key2 = generateUserKey(testPassword, salt2);
      
      return Promise.all([key1, key2]).then(([userKey1, userKey2]) => {
        const encrypted = encryptData(testData, userKey1);
        
        expect(() => {
          decryptData(encrypted, userKey2);
        }).toThrow();
      });
    });
  });

  describe('verifyEncryptionKey', () => {
    it('正しいキーでtrueを返す', () => {
      const salt = generateSalt();
      const key = generateUserKey(testPassword, salt);
      
      return key.then(userKey => {
        const encrypted = encryptData(testData, userKey);
        const isValid = verifyEncryptionKey(encrypted, userKey);
        
        expect(isValid).toBe(true);
      });
    });

    it('間違ったキーでfalseを返す', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      const key1 = generateUserKey(testPassword, salt1);
      const key2 = generateUserKey(testPassword, salt2);
      
      return Promise.all([key1, key2]).then(([userKey1, userKey2]) => {
        const encrypted = encryptData(testData, userKey1);
        const isValid = verifyEncryptionKey(encrypted, userKey2);
        
        expect(isValid).toBe(false);
      });
    });
  });

  describe('validateEncryptedData', () => {
    it('有効な暗号化データでtrueを返す', () => {
      const salt = generateSalt();
      const key = generateUserKey(testPassword, salt);
      
      return key.then(userKey => {
        const encrypted = encryptData(testData, userKey);
        const isValid = validateEncryptedData(encrypted);
        
        expect(isValid).toBe(true);
      });
    });

    it('無効なデータでfalseを返す', () => {
      const invalidData = {
        encryptedContent: 'invalid',
        // 必要なフィールドが不足
      };
      
      const isValid = validateEncryptedData(invalidData);
      expect(isValid).toBe(false);
    });

    it('nullでfalseを返す', () => {
      const isValid = validateEncryptedData(null);
      expect(isValid).toBe(false);
    });
  });

  describe('エラーハンドリング', () => {
    it('空のデータで暗号化時にエラーを投げる', () => {
      const salt = generateSalt();
      const key = generateUserKey(testPassword, salt);
      
      return key.then(userKey => {
        expect(() => {
          encryptData('', userKey);
        }).toThrow();
      });
    });

    it('無効な暗号化データで復号化時にエラーを投げる', () => {
      const salt = generateSalt();
      const key = generateUserKey(testPassword, salt);
      
      return key.then(userKey => {
        const invalidEncryptedData: EncryptedData = {
          encryptedContent: 'invalid',
          iv: 'invalid',
          salt: 'invalid',
          version: '1.0',
          createdAt: new Date(),
        };
        
        expect(() => {
          decryptData(invalidEncryptedData, userKey);
        }).toThrow();
      });
    });
  });
});
