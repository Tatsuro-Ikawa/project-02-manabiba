import { readFileSync } from 'fs';
import * as admin from 'firebase-admin';

function parseServiceAccount(json: string): admin.ServiceAccount {
  const o = JSON.parse(json) as Record<string, string | undefined>;
  const projectId = o.project_id ?? o.projectId;
  const clientEmail = o.client_email ?? o.clientEmail;
  const privateKey = o.private_key ?? o.privateKey;
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('サービスアカウント JSON に project_id / client_email / private_key が必要です');
  }
  return { projectId, clientEmail, privateKey };
}

function loadServiceAccountFromCredentialsFile(): admin.ServiceAccount | null {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!credPath) return null;
  let raw: string;
  try {
    raw = readFileSync(credPath, 'utf8');
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(
      `GOOGLE_APPLICATION_CREDENTIALS の鍵ファイルを読めません: ${credPath} (${detail})`
    );
  }
  return parseServiceAccount(raw);
}

/**
 * Firebase Admin（Route Handlers / サーバーのみ）。
 * 優先: `FIREBASE_SERVICE_ACCOUNT_JSON` → `GCP_SA_KEY_JSON` → `GOOGLE_APPLICATION_CREDENTIALS`（JSON ファイルパス）
 */
export function getFirebaseAdminApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

  const firebaseJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (firebaseJson) {
    const cred = parseServiceAccount(firebaseJson);
    return admin.initializeApp({
      credential: admin.credential.cert(cred),
      projectId: cred.projectId || projectId,
    });
  }

  const gcpJson = process.env.GCP_SA_KEY_JSON?.trim();
  if (gcpJson) {
    const cred = parseServiceAccount(gcpJson);
    return admin.initializeApp({
      credential: admin.credential.cert(cred),
      projectId: cred.projectId || projectId,
    });
  }

  const fileCred = loadServiceAccountFromCredentialsFile();
  if (fileCred) {
    return admin.initializeApp({
      credential: admin.credential.cert(fileCred),
      projectId: fileCred.projectId || projectId,
    });
  }

  throw new Error(
    'Firebase Admin が未設定です。FIREBASE_SERVICE_ACCOUNT_JSON、GCP_SA_KEY_JSON、または GOOGLE_APPLICATION_CREDENTIALS（鍵 JSON のファイルパス）を設定してください。'
  );
}
