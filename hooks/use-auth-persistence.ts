// hooks/use-auth-persistence.ts
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { api } from "@/lib/api";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { useRouter } from "next/navigation";

// Helper function to check if token is expired
export const isTokenExpired = (token: string): boolean => {
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

export function useAuthPersistence() {
  const { token, isAuthenticated, actions } = useAuthStore();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();

  // Ensure cookie is set if we have a token in Zustand store
  useEffect(() => {
    if (token) {
      // Check if token is expired
      if (isTokenExpired(token)) {
        console.log("Token has expired, logging out...");
        actions.logout();
        Cookies.remove("token");
        router.push("/login");
        return;
      }

      const cookieToken = Cookies.get("token");
      if (!cookieToken) {
        Cookies.set("token", token, {
          expires: 7,
          path: "/",
          sameSite: "lax",
        });
      }

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      Cookies.remove("token");
      delete api.defaults.headers.common["Authorization"];
    }
  }, [token, actions, router]);

  // Setup periodic token validation
  useEffect(() => {
    const validateSession = async () => {
      try {
        setIsCheckingAuth(true);

        // Check for token in both Zustand and cookies
        const storeToken = useAuthStore.getState().token;
        const cookieToken = Cookies.get("token");
        const activeToken = storeToken || cookieToken;

        if (!activeToken) {
          // No token found, nothing to validate
          return;
        }

        // Check if token is expired
        if (activeToken && isTokenExpired(activeToken)) {
          console.log("Token has expired during validation check");
          actions.logout();
          Cookies.remove("token");
          router.push("/login");
          return;
        }

        // If we have a token and it's not expired, validate with the server
        if (activeToken) {
          try {
            const response = await api.get("/auth/me");
            actions.setUser(response.data.user);

            // If we had a token in cookie but not in store, update the store
            if (cookieToken && !storeToken) {
              actions.setToken(cookieToken);
            }
          } catch (error) {
            console.error("Session validation failed", error);
            actions.logout();
            Cookies.remove("token");
            router.push("/login");
          }
        }
      } finally {
        setIsCheckingAuth(false);
      }
    };

    // Run once on mount
    validateSession();

    // Also set up a periodic check every 15 minutes
    const intervalId = setInterval(() => {
      const storeToken = useAuthStore.getState().token;
      if (storeToken && isTokenExpired(storeToken)) {
        console.log("Token expired during interval check");
        actions.logout();
        Cookies.remove("token");
        router.push("/login");
      }
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(intervalId);
  }, [actions, router]);

  return { isAuthenticated, isCheckingAuth };
}
