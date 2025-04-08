import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

const authRoutes = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];
const protectedRoutes = ["/chat"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Try to get token from cookie
  const token = request.cookies.get("token")?.value;

  // Alternative check: Get token from authorization header
  const authHeader = request.headers.get("authorization");
  const headerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;

  const isAuthenticated = !!(token || headerToken);

  // Handle root path specifically - redirect to chat if authenticated, login if not
  if (pathname === "/") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/chat", request.url));
    } else {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // If not authenticated and trying to access protected route
  if (
    !isAuthenticated &&
    protectedRoutes.some((route) => pathname.startsWith(route))
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If authenticated and trying to access auth routes
  if (isAuthenticated && authRoutes.some((route) => pathname === route)) {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/chat",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/profile/:path*",
    "/chat/:path*",
    "/settings/:path*",
  ],
};
