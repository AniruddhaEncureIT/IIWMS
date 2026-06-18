import type { StorageKey } from "@/constants/storage-keys";
import type { IStore } from "@/types/store.types";

class LocalStorageStore implements IStore {
  private static instance: LocalStorageStore;

  private constructor() {}

  static getInstance(): LocalStorageStore {
    if (!LocalStorageStore.instance) {
      LocalStorageStore.instance = new LocalStorageStore();
    }
    return LocalStorageStore.instance;
  }

  private isAvailable(): boolean {
    return typeof window !== "undefined" && typeof localStorage !== "undefined";
  }

  get<T>(key: StorageKey): T | null {
    if (!this.isAvailable()) return null;
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  set<T>(key: StorageKey, value: T): void {
    if (!this.isAvailable()) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.warn(`[Store] Failed to write key "${key}" to localStorage.`);
    }
  }

  remove(key: StorageKey): void {
    if (!this.isAvailable()) return;
    localStorage.removeItem(key);
  }

  clear(): void {
    if (!this.isAvailable()) return;
    localStorage.clear();
  }

  has(key: StorageKey): boolean {
    if (!this.isAvailable()) return false;
    return localStorage.getItem(key) !== null;
  }
}

export const store = LocalStorageStore.getInstance();
