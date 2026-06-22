import { MockAuthRepository } from "@/repositories/auth.repository";
import type { IAuthRepository } from "@/repositories/auth.repository";
import { store } from "@/store/local-storage.store";
import { STORAGE_KEYS } from "@/constants/storage-keys";
import type { LoginCredentials, User, AuthTokens } from "@/types/auth.types";

class AuthService {
  private static instance: AuthService;
  private readonly repo: IAuthRepository;

  private constructor(repo: IAuthRepository) {
    this.repo = repo;
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService(new MockAuthRepository());
    }
    return AuthService.instance;
  }

  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await this.repo.login(credentials);
    const { user, tokens } = response.data;

    // Store user info in localStorage for display (name, role, etc.)
    // But NOT tokens — they stay ONLY in HTTP-only cookies
    store.set(STORAGE_KEYS.AUTH_USER, user);

    // Set token in cookie (verified by middleware server-side)
    // Note: HttpOnly flag can only be set by server, not JavaScript
    const isProduction = process.env.NODE_ENV === "production";
    const secure = isProduction ? "; Secure" : "";
    document.cookie = `${STORAGE_KEYS.AUTH_TOKEN}=${tokens.accessToken}; path=/; max-age=${60 * 60 * 8}; SameSite=Lax${secure}`;

    return { user, tokens };
  }

  async logout(): Promise<void> {
    // Clear user from localStorage
    store.remove(STORAGE_KEYS.AUTH_USER);

    // Clear legacy token storage (if any)
    store.remove(STORAGE_KEYS.AUTH_TOKEN);

    // Expire auth cookie immediately (session ends)
    document.cookie = `${STORAGE_KEYS.AUTH_TOKEN}=; path=/; max-age=0; SameSite=Lax`;

    // Clear legacy localStorage key
    if (typeof window !== "undefined") {
      localStorage.removeItem("iims-current-user");
    }
  }

  async refreshAuth(): Promise<{ user: User; tokens: AuthTokens } | null> {
    // Middleware handles token refresh via cookies
    // Just check if user is still stored in localStorage
    const user = store.get<User>(STORAGE_KEYS.AUTH_USER);
    if (!user) return null;

    // Notify backend to refresh tokens (sets new cookie)
    try {
      await this.repo.logout().catch(() => undefined);
    } catch {
      // Token might be expired, logout will handle cleanup
      return null;
    }

    return {
      user,
      tokens: { accessToken: "", refreshToken: "", expiresAt: 0 },
    };
  }

  getStoredSession(): { user: User; tokens: AuthTokens } | null {
    // Check if user is stored (means they're logged in)
    // Tokens are in HTTP-only cookie (verified by middleware)
    const user = store.get<User>(STORAGE_KEYS.AUTH_USER);
    if (!user) return null;

    // Return user with empty tokens (tokens are in cookie, not readable by JS)
    return {
      user,
      tokens: { accessToken: "", refreshToken: "", expiresAt: 0 },
    };
  }
}

export const authService = AuthService.getInstance();
