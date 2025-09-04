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
    const decoded: any = jwtDecode(token);
    if (!decoded.exp) return false;
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (error) {
    console.error("Error decoding token:", error);
    return true;
  }
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (authRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;

  let isAuthenticated = false;

  // Check authentication status
  if (token && !isTokenExpired(token)) {
    isAuthenticated = true;
  } else if (token && isTokenExpired(token) && !refreshToken) {
    // Token expired and no refresh token - clean up and redirect
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("token");
    response.cookies.delete("refreshToken");
    return response;
  } else if (refreshToken) {
    // We have refresh token, let the client handle token refresh
    isAuthenticated = true;
  }

  // Redirect authenticated users from root to chat
  if (isAuthenticated && pathname === "/") {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  // Protect routes that require authentication
  if (
    !isAuthenticated &&
    (protectedRoutes.some((route) => pathname.startsWith(route)) ||
      pathname === "/")
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
