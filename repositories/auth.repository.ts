import type { LoginCredentials, AuthTokens, User } from "@/types/auth.types";
import type { ApiResponse } from "@/types/api.types";
import type { IUser } from "@/types/iims.types";

export interface IAuthRepository {
  login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>>;
  logout(): Promise<ApiResponse<null>>;
  getCurrentUser(token: string): Promise<ApiResponse<User>>;
  refreshToken(refreshToken: string): Promise<ApiResponse<AuthTokens>>;
}

// Maps IIMS IUser (which has role as string) to the auth-provider User type
function toAuthUser(iUser: IUser): User {
  return {
    id: iUser.id,
    email: iUser.email,
    name: iUser.name,
    role: iUser.role as User["role"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export class MockAuthRepository implements IAuthRepository {
  private readonly MOCK_DELAY_MS = 600;

  private delay(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, this.MOCK_DELAY_MS));
  }

  private generateTokens(): AuthTokens {
    return {
      accessToken: `mock_access_${Math.random().toString(36).slice(2)}`,
      refreshToken: `mock_refresh_${Math.random().toString(36).slice(2)}`,
      expiresAt: Date.now() + 1000 * 60 * 60 * 8,
    };
  }

  async login(
    credentials: LoginCredentials
  ): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> {
    await this.delay();

    const { SEED_USERS } = await import("@/mock-data/users.mock");
    const match = SEED_USERS.find(
      (u) =>
        u.email === credentials.email &&
        u.password === credentials.password &&
        u.status === "Active"
    );

    if (!match) throw new Error("Invalid credentials. Please check your email and password.");

    return {
      success: true,
      message: "Login successful.",
      data: { user: toAuthUser(match), tokens: this.generateTokens() },
    };
  }

  async logout(): Promise<ApiResponse<null>> {
    await this.delay();
    return { success: true, message: "Logged out successfully.", data: null };
  }

  async getCurrentUser(token: string): Promise<ApiResponse<User>> {
    await this.delay();

    if (!token.startsWith("mock_access_")) {
      throw new Error("Invalid or expired token.");
    }

    const { SEED_USERS } = await import("@/mock-data/users.mock");
    return { success: true, message: "User fetched.", data: toAuthUser(SEED_USERS[0]) };
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthTokens>> {
    await this.delay();

    if (!refreshToken.startsWith("mock_refresh_")) {
      throw new Error("Invalid refresh token.");
    }

    return { success: true, message: "Token refreshed.", data: this.generateTokens() };
  }
}
