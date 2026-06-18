// All IIMS roles exactly as specified in the seed data
export type UserRole =
  | "Sectional Engineer"
  | "Deputy Engineer"
  | "Executive Engineer"
  | "Tender Clerk"
  | "Auditor"
  | "Accountant"
  | "Assistant Accounts Officer"
  | "Chief Accounts and Finance Officer"
  | "Additional Chief Executive Officer"
  | "Chief Executive Officer"
  | "System Administrator"
  | "Contractor"
  | "Technical System Configurator";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}
