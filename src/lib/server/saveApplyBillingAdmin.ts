import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';
import type { ApplyBillingInput } from '@/lib/subscription/courseReturn';
import { FieldValue } from 'firebase-admin/firestore';

/** Checkout 前に申込者情報を Admin SDK で保存 */
export async function saveApplyBillingAdmin(uid: string, billing: ApplyBillingInput): Promise<void> {
  const db = getFirebaseAdminApp().firestore();
  await db.doc(`users/${uid}`).set(
    {
      applyBilling: {
        fullName: billing.fullName.trim(),
        postalCode: billing.postalCode.trim(),
        address: billing.address.trim(),
        phone: billing.phone.trim(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      displayName: billing.fullName.trim(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}
