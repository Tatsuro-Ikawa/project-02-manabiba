import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  addDoc,
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

// 型定義
export interface UserProfile {
  uid: string;
  nickname: string;
  bio: string;
  location: string;
  profileCreatedAt: Timestamp;
  profileUpdatedAt: Timestamp;
}

export interface PDCAData {
  id?: string;
  uid: string;
  date: string;
  plan?: string;
  planCreatedAt?: Timestamp;
  planUpdatedAt?: Timestamp;
  do?: string;
  doCreatedAt?: Timestamp;
  doUpdatedAt?: Timestamp;
  check?: string;
  checkCreatedAt?: Timestamp;
  checkUpdatedAt?: Timestamp;
  action?: string;
  actionCreatedAt?: Timestamp;
  actionUpdatedAt?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ユーザープロフィール操作
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, 'user_profiles', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    } else {
      return null;
    }
  } catch (error) {
    console.error('ユーザープロフィール取得エラー:', error);
    throw error;
  }
};

export const createUserProfile = async (profile: Omit<UserProfile, 'profileCreatedAt' | 'profileUpdatedAt'>): Promise<void> => {
  try {
    const now = serverTimestamp() as Timestamp;
    const profileData: UserProfile = {
      ...profile,
      profileCreatedAt: now,
      profileUpdatedAt: now,
    };
    
    await setDoc(doc(db, 'user_profiles', profile.uid), profileData);
  } catch (error) {
    console.error('ユーザープロフィール作成エラー:', error);
    throw error;
  }
};

export const updateUserProfile = async (uid: string, updates: Partial<UserProfile>): Promise<void> => {
  try {
    const docRef = doc(db, 'user_profiles', uid);
    await updateDoc(docRef, {
      ...updates,
      profileUpdatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('ユーザープロフィール更新エラー:', error);
    throw error;
  }
};

// PDCA操作
export const getPDCAEntry = async (uid: string, date: string): Promise<PDCAData | null> => {
  try {
    const q = query(
      collection(db, 'pdca_entries'),
      where('uid', '==', uid),
      where('date', '==', date)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as PDCAData;
    } else {
      return null;
    }
  } catch (error) {
    console.error('PDCAエントリ取得エラー:', error);
    throw error;
  }
};

export const getUserPDCAEntries = async (uid: string): Promise<PDCAData[]> => {
  try {
    const q = query(
      collection(db, 'pdca_entries'),
      where('uid', '==', uid),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PDCAData[];
  } catch (error) {
    console.error('ユーザーPDCAエントリ取得エラー:', error);
    throw error;
  }
};

export const createPDCAEntry = async (pdcaData: Omit<PDCAData, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = serverTimestamp() as Timestamp;
    const entryData: Omit<PDCAData, 'id'> = {
      ...pdcaData,
      createdAt: now,
      updatedAt: now,
    };
    
    const docRef = await addDoc(collection(db, 'pdca_entries'), entryData);
    return docRef.id;
  } catch (error) {
    console.error('PDCAエントリ作成エラー:', error);
    throw error;
  }
};

export const updatePDCAEntry = async (id: string, updates: Partial<PDCAData>): Promise<void> => {
  try {
    const docRef = doc(db, 'pdca_entries', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('PDCAエントリ更新エラー:', error);
    throw error;
  }
};

// 特定のPDCA項目を更新
export const updatePDCAItem = async (
  uid: string, 
  date: string, 
  item: 'plan' | 'do' | 'check' | 'action', 
  value: string
): Promise<void> => {
  try {
    const entry = await getPDCAEntry(uid, date);
    const now = serverTimestamp() as Timestamp;
    
    if (entry) {
      // 既存エントリを更新
      await updatePDCAEntry(entry.id!, {
        [item]: value,
        [`${item}CreatedAt`]: entry[`${item}CreatedAt`] || now,
        [`${item}UpdatedAt`]: now,
      });
    } else {
      // 新規エントリを作成
      const newEntry: Omit<PDCAData, 'id' | 'createdAt' | 'updatedAt'> = {
        uid,
        date,
        [item]: value,
        [`${item}CreatedAt`]: now,
        [`${item}UpdatedAt`]: now,
      };
      await createPDCAEntry(newEntry);
    }
  } catch (error) {
    console.error('PDCA項目更新エラー:', error);
    throw error;
  }
};
