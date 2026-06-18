"use client";

import { useState, useCallback } from "react";
import { store } from "@/store/local-storage.store";
import type { StorageKey } from "@/constants/storage-keys";

export function useLocalStorage<T>(key: StorageKey, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    return store.get<T>(key) ?? initialValue;
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        store.set(key, next);
        return next;
      });
    },
    [key]
  );

  const removeValue = useCallback(() => {
    store.remove(key);
    setStoredValue(initialValue);
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
}
