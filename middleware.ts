import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { jwtDecode } from "jwt-decode";

const authRoutes = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];
const protectedRoutes = ["/chat"];
const isTokenExpired = (token: string): boolean => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decoded: any = jwtDecode(token);

    // Check if token has expiration (exp) claim
    if (!decoded.exp) return false;

    // exp is in seconds, Date.now() is in milliseconds
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (error) {
    console.error("Error decoding token:", error);
    return true; // If we can't decode it, treat as expired
  }
};
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Try to get token from cookie
  const token = request.cookies.get("token")?.value;

  // Alternative check: Get token from authorization header
  const authHeader = request.headers.get("authorization");
  const headerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;
  if (token && isTokenExpired(token)) {
    // Token expired, clean up and redirect to login
    setTimeout(() => {
      request.cookies.delete("token");
      window.location.href = "/login";
    }, 0);
    return NextResponse.redirect(new URL("/login", request.url));
  }
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
