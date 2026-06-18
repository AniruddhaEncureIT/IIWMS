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

    store.set(STORAGE_KEYS.AUTH_USER, user);
    store.set(STORAGE_KEYS.AUTH_TOKEN, tokens);

    // Persist token to cookie so Next.js middleware can read it server-side
    document.cookie = `${STORAGE_KEYS.AUTH_TOKEN}=${tokens.accessToken}; path=/; max-age=${60 * 60 * 8}; SameSite=Lax`;

    return { user, tokens };
  }

  async logout(): Promise<void> {
    const tokens = store.get<AuthTokens>(STORAGE_KEYS.AUTH_TOKEN);
    if (tokens) {
      await this.repo.logout().catch(() => undefined);
    }

    store.remove(STORAGE_KEYS.AUTH_USER);
    store.remove(STORAGE_KEYS.AUTH_TOKEN);

    // Expire cookie
    document.cookie = `${STORAGE_KEYS.AUTH_TOKEN}=; path=/; max-age=0; SameSite=Lax`;
  }

  async refreshAuth(): Promise<{ user: User; tokens: AuthTokens } | null> {
    const tokens = store.get<AuthTokens>(STORAGE_KEYS.AUTH_TOKEN);
    if (!tokens) return null;

    // Check expiry before hitting the mock
    if (tokens.expiresAt <= Date.now()) {
      await this.logout();
      return null;
    }

    try {
      const response = await this.repo.refreshToken(tokens.refreshToken);
      const newTokens = response.data;
      store.set(STORAGE_KEYS.AUTH_TOKEN, newTokens);
      document.cookie = `${STORAGE_KEYS.AUTH_TOKEN}=${newTokens.accessToken}; path=/; max-age=${60 * 60 * 8}; SameSite=Lax`;

      const user = store.get<User>(STORAGE_KEYS.AUTH_USER);
      return user ? { user, tokens: newTokens } : null;
    } catch {
      await this.logout();
      return null;
    }
  }

  getStoredSession(): { user: User; tokens: AuthTokens } | null {
    const user = store.get<User>(STORAGE_KEYS.AUTH_USER);
    const tokens = store.get<AuthTokens>(STORAGE_KEYS.AUTH_TOKEN);
    if (!user || !tokens) return null;
    if (tokens.expiresAt <= Date.now()) return null;
    return { user, tokens };
  }
}

export const authService = AuthService.getInstance();
