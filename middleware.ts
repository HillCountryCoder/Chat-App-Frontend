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

  let isAuthenticated = false;

  // Check if we have a token and if it's not expired
  if (token || headerToken) {
    const tokenToCheck = token || headerToken;
    if (tokenToCheck && !isTokenExpired(tokenToCheck)) {
      isAuthenticated = true;
    } else if (token && isTokenExpired(token)) {
      // Token is expired, delete it and redirect to login
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("token");
      return response;
    }
  }

  // If authenticated and trying to access auth routes (login, register, etc.)
  if (isAuthenticated && authRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  // If authenticated and at root, redirect to /chat
  if (isAuthenticated && pathname === "/") {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  // If not authenticated and trying to access protected routes
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
