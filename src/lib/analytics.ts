"use client";

import app from "@/lib/firebase";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";

let analyticsInstance: Analytics | null = null;

export async function getClientAnalytics(): Promise<Analytics | null> {
  try {
    if (typeof window === "undefined") return null;
    if (analyticsInstance) return analyticsInstance;

    const supported = await isSupported();
    if (!supported) return null;

    analyticsInstance = getAnalytics(app);
    return analyticsInstance;
  } catch (_err) {
    // SafariのITPやブラウザ制限で失敗する場合があるため握りつぶす
    return null;
  }
}
