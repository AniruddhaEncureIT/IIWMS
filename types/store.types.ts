import type { StorageKey } from "@/constants/storage-keys";

export interface IStore {
  get<T>(key: StorageKey): T | null;
  set<T>(key: StorageKey, value: T): void;
  remove(key: StorageKey): void;
  clear(): void;
  has(key: StorageKey): boolean;
}
