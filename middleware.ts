import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ROUTES, PUBLIC_ROUTES, AUTH_ROUTES } from "@/constants/routes";
import { STORAGE_KEYS } from "@/constants/storage-keys";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(STORAGE_KEYS.AUTH_TOKEN)?.value;
  const isAuthenticated = Boolean(token);

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  // Redirect unauthenticated users away from protected routes
  if (!isAuthenticated && !isPublicRoute) {
    const loginUrl = new URL(ROUTES.LOGIN, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth routes (login / register)
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL(ROUTES.DASHBOARD, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image  (image optimisation)
     * - favicon.ico
     * - public assets
     * - api routes
     */
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
