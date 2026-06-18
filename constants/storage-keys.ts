// Auth-provider keys (token-based, underscore-separated)
export const AUTH_STORAGE_KEYS = {
  AUTH_TOKEN: "iims_auth_token",
  AUTH_USER: "iims_auth_user",
  THEME: "iims_theme",
} as const;

export type AuthStorageKey = (typeof AUTH_STORAGE_KEYS)[keyof typeof AUTH_STORAGE_KEYS];

// IIMS Store keys (as per spec, hyphen-separated)
export const STORE_KEYS = {
  USERS: "iims-users",
  PROJECTS: "iims-projects",
  CHARGES: "iims-charges",
  CURRENT_USER: "iims-current-user",
  RATE_ITEMS: "iims-rate-items",
  TEMPLATES: "iims-templates",
} as const;

export type StoreKey = (typeof STORE_KEYS)[keyof typeof STORE_KEYS];

// Unified alias kept for backward-compat with existing local-storage.store.ts
export const STORAGE_KEYS = AUTH_STORAGE_KEYS;
export type StorageKey = AuthStorageKey;
