// ═══════════════════════════════════════════
// STORAGE — uses localStorage for persistence
// ═══════════════════════════════════════════
const STORAGE_KEY = "dothunter-data";

export async function loadData(): Promise<any | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveData(d: any): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch (e) {
    console.error(e);
  }
}
