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

/**
 * Firebase Admin（Route Handlers / サーバーのみ）。
 * `FIREBASE_SERVICE_ACCOUNT_JSON`（推奨）または既存の `GCP_SA_KEY_JSON`（同一プロジェクトの SA）で初期化する。
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

  throw new Error(
    'Firebase Admin が未設定です。FIREBASE_SERVICE_ACCOUNT_JSON または GCP_SA_KEY_JSON を設定してください。'
  );
}
