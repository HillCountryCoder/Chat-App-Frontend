import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

const authRoutes = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];
const protectedRoutes = ["/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Debugging: Log all cookies
  console.log(
    "All cookie keys:",
    request.cookies.getAll().map((c) => c.name),
  );

  // Try to get token from cookie
  const token = request.cookies.get("token")?.value;
  console.log("Token from cookie:", token ? "Present" : "Not found");

  // Alternative check: Get token from authorization header
  const authHeader = request.headers.get("authorization");
  const headerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;

  const isAuthenticated = !!(token || headerToken);
  console.log("Authentication status:", isAuthenticated);

  // If not authenticated and trying to access protected route
  if (!isAuthenticated && protectedRoutes.some((route) => pathname === route)) {
    console.log("Redirecting unauthenticated user from:", pathname);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If authenticated and trying to access auth routes
  if (isAuthenticated && authRoutes.some((route) => pathname === route)) {
    console.log("Redirecting authenticated user from:", pathname);
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/profile/:path*",
    "/chat/:path*",
    "/settings/:path*",
  ],
};
