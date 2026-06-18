export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/dashboard",
  UNAUTHORIZED: "/unauthorized",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

export const PUBLIC_ROUTES: AppRoute[] = [ROUTES.LOGIN, ROUTES.REGISTER];
export const AUTH_ROUTES: AppRoute[] = [ROUTES.LOGIN, ROUTES.REGISTER];
