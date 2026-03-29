// ═══════════════════════════════════════════
// PURCHASE — Web-based Stripe Checkout
// Opens the Stripe checkout in the device
// browser. Uses the same Vercel API backend
// as the web version. Device ID is shared
// so unlock status persists across both.
// ═══════════════════════════════════════════
import * as WebBrowser from "expo-web-browser";
import { loadData, saveData } from "./storage";

const API_BASE = "https://dothunter-six.vercel.app";

/**
 * Get or create a persistent device ID for anonymous purchase tracking.
 */
async function getDeviceId(): Promise<string> {
  const data = await loadData();
  return data.deviceId || "unknown";
}

/**
 * Check if the device has been unlocked via the backend.
 */
export async function checkUnlockStatus(): Promise<boolean> {
  try {
    const deviceId = await getDeviceId();
    const res = await fetch(`${API_BASE}/api/device/status?deviceId=${deviceId}`);
    if (!res.ok) return false;
    const json = await res.json();
    return json.gameUnlocked === true;
  } catch (e) {
    console.warn("Failed to check unlock status:", e);
    return false;
  }
}

/**
 * Open Stripe Checkout in the device browser for the $1.99 unlock.
 * Returns true if the browser was opened successfully.
 */
export async function purchaseUnlock(): Promise<boolean> {
  try {
    const deviceId = await getDeviceId();

    // Create a checkout session via the Vercel API
    const res = await fetch(`${API_BASE}/api/trpc/purchase.createCheckout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-id": deviceId,
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      console.error("Checkout creation failed:", res.status);
      return false;
    }

    const json = await res.json();
    // tRPC response format: { result: { data: { url: "..." } } }
    const checkoutUrl =
      json?.result?.data?.url || json?.result?.data || json?.url;

    if (!checkoutUrl || typeof checkoutUrl !== "string") {
      console.error("No checkout URL returned:", json);
      return false;
    }

    // Open the Stripe checkout in the device browser
    await WebBrowser.openBrowserAsync(checkoutUrl);
    return true;
  } catch (e) {
    console.error("Purchase error:", e);
    return false;
  }
}

/**
 * Restore purchases by checking the backend status.
 * Same as checkUnlockStatus since the backend is the source of truth.
 */
export async function restorePurchases(): Promise<boolean> {
  return checkUnlockStatus();
}

// No-op stubs to maintain API compatibility with GameScreen
export async function initIAP(_onUnlock: () => void): Promise<void> {
  // No native IAP to initialize
}

export async function disconnectIAP(): Promise<void> {
  // No native IAP to disconnect
}

export async function getProduct(): Promise<null> {
  // No native product info — price is hardcoded in the UI
  return null;
}
