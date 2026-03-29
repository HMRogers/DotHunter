// ═══════════════════════════════════════════
// IN-APP PURCHASE — Google Play Billing
// Uses expo-in-app-purchases for the $1.99
// one-time unlock. Falls back gracefully if
// IAP is unavailable (e.g. in development).
// ═══════════════════════════════════════════
import * as InAppPurchases from "expo-in-app-purchases";
import { saveData, loadData } from "./storage";

const PRODUCT_ID = "dothunter_full_unlock";

let isConnected = false;
// setPurchaseListener doesn't return a subscription in this version

export async function initIAP(onUnlock: () => void): Promise<void> {
  try {
    await InAppPurchases.connectAsync();
    isConnected = true;

    // Listen for purchase results
    InAppPurchases.setPurchaseListener(({ responseCode, results }) => {
      if (responseCode === InAppPurchases.IAPResponseCode.OK && results) {
        for (const purchase of results) {
          if (!purchase.acknowledged) {
            InAppPurchases.finishTransactionAsync(purchase, false).catch(console.error);
          }
          onUnlock();
        }
      }
    });
  } catch (e) {
    console.warn("IAP init failed (expected in dev):", e);
  }
}

export async function getProduct(): Promise<InAppPurchases.IAPItemDetails | null> {
  if (!isConnected) return null;
  try {
    const { results } = await InAppPurchases.getProductsAsync([PRODUCT_ID]);
    return results && results.length > 0 ? results[0] : null;
  } catch {
    return null;
  }
}

export async function purchaseUnlock(): Promise<boolean> {
  if (!isConnected) {
    console.warn("IAP not connected — cannot purchase");
    return false;
  }
  try {
    await InAppPurchases.purchaseItemAsync(PRODUCT_ID);
    return true;
  } catch (e) {
    console.error("Purchase error:", e);
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!isConnected) return false;
  try {
    const { results } = await InAppPurchases.getPurchaseHistoryAsync();
    if (results && results.length > 0) {
      return results.some((p) => p.productId === PRODUCT_ID);
    }
    return false;
  } catch {
    return false;
  }
}

export async function disconnectIAP(): Promise<void> {
  try {
    if (isConnected) {
      await InAppPurchases.disconnectAsync();
      isConnected = false;
    }
  } catch {}
}
