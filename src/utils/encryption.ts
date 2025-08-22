import CryptoJS from 'crypto-js';

// 暗号化設定
export interface EncryptionConfig {
  algorithm: 'AES-256-GCM';
  keySize: number;
  saltRounds: number;
  sessionTimeout: number;
}

// 暗号化データ構造
export interface EncryptedData {
  encryptedContent: string;
  iv: string;
  salt: string;
  version: string;
  createdAt: Date;
}

// デフォルト設定
export const DEFAULT_ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: 'AES-256-GCM',
  keySize: 256,
  saltRounds: 10000,
  sessionTimeout: 30 * 60 * 1000, // 30分
};

// ユーザー固有キーの生成
export const generateUserKey = async (
  password: string,
  salt: string
): Promise<string> => {
  try {
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32, // 256ビット
      iterations: DEFAULT_ENCRYPTION_CONFIG.saltRounds,
    });
    return key.toString();
  } catch (error) {
    console.error('ユーザーキー生成エラー:', error);
    throw new Error('ユーザーキーの生成に失敗しました');
  }
};

// ランダムなソルトの生成
export const generateSalt = (): string => {
  return CryptoJS.lib.WordArray.random(128 / 8).toString();
};

// ランダムなIVの生成
export const generateIV = (): string => {
  return CryptoJS.lib.WordArray.random(128 / 8).toString();
};

// データの暗号化
export const encryptData = (
  data: string,
  key: string,
  iv?: string
): EncryptedData => {
  try {
    const salt = generateSalt();
    const ivToUse = iv || generateIV();
    
    // キーから暗号化キーを生成
    const encryptionKey = CryptoJS.PBKDF2(key, salt, {
      keySize: 256 / 32,
      iterations: DEFAULT_ENCRYPTION_CONFIG.saltRounds,
    });

    // データを暗号化
    const encrypted = CryptoJS.AES.encrypt(data, encryptionKey, {
      iv: CryptoJS.enc.Hex.parse(ivToUse),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return {
      encryptedContent: encrypted.toString(),
      iv: ivToUse,
      salt: salt,
      version: '1.0',
      createdAt: new Date(),
    };
  } catch (error) {
    console.error('データ暗号化エラー:', error);
    throw new Error('データの暗号化に失敗しました');
  }
};

// データの復号化
export const decryptData = (
  encryptedData: EncryptedData,
  key: string
): string => {
  try {
    // キーから復号化キーを生成
    const decryptionKey = CryptoJS.PBKDF2(key, encryptedData.salt, {
      keySize: 256 / 32,
      iterations: DEFAULT_ENCRYPTION_CONFIG.saltRounds,
    });

    // データを復号化
    const decrypted = CryptoJS.AES.decrypt(encryptedData.encryptedContent, decryptionKey, {
      iv: CryptoJS.enc.Hex.parse(encryptedData.iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedString) {
      throw new Error('復号化されたデータが空です');
    }

    return decryptedString;
  } catch (error) {
    console.error('データ復号化エラー:', error);
    throw new Error('データの復号化に失敗しました');
  }
};

// 暗号化キーの検証
export const verifyEncryptionKey = (
  encryptedData: EncryptedData,
  key: string
): boolean => {
  try {
    decryptData(encryptedData, key);
    return true;
  } catch (error) {
    return false;
  }
};

// データの整合性チェック
export const validateEncryptedData = (data: any): data is EncryptedData => {
  return (
    data &&
    typeof data.encryptedContent === 'string' &&
    typeof data.iv === 'string' &&
    typeof data.salt === 'string' &&
    typeof data.version === 'string' &&
    data.createdAt instanceof Date
  );
};
