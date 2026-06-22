// IndexedDB-based storage for organisation logos.
// Prevents localStorage quota exhaustion from large base64 images.
// Migrates any existing localStorage values to IndexedDB on first access.

const DB_NAME    = "iims-assets";
const DB_VERSION = 1;
const STORE_NAME = "logos";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function saveLogo(key: string, dataUrl: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(dataUrl, key);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

export async function loadLogo(key: string): Promise<string | null> {
  // Migrate legacy localStorage value to IndexedDB on first access
  if (typeof localStorage !== "undefined") {
    const legacy = localStorage.getItem(key);
    if (legacy) {
      await saveLogo(key, legacy);
      localStorage.removeItem(key);
      return legacy;
    }
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve((req.result as string | undefined) ?? null);
    req.onerror   = () => reject(req.error);
  });
}

export async function removeLogo(key: string): Promise<void> {
  if (typeof localStorage !== "undefined") localStorage.removeItem(key); // clean legacy
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}
