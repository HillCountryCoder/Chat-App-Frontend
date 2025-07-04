"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { api } from "@/lib/api";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { reconnectSocket } from "@/lib/socket";
import { getExpiryDays } from "@/utils/date-utils";

export const isTokenExpired = (token: string): boolean => {
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

export function useAuthPersistence() {
  const { token, refreshToken, isAuthenticated, _hasHydrated, actions } =
    useAuthStore();

  // Session restoration ONLY after hydration
  useEffect(() => {
    if (!_hasHydrated) return;

    const restoreSession = async () => {
      const cookieToken = Cookies.get("token");
      const cookieRefreshToken = Cookies.get("refreshToken");

      // Check if we have a token in store that hasn't expired
      const hasNonExpiredToken = token && !isTokenExpired(token);

      // But we also need to check if it's actually valid (authenticated state)
      const shouldSkipRestoration = hasNonExpiredToken && isAuthenticated;

      if (shouldSkipRestoration) {
        return;
      }

      // If we have refresh token (either in store or cookies) and need to refresh
      const availableRefreshToken = refreshToken || cookieRefreshToken;
      const needsRefresh =
        availableRefreshToken &&
        (!cookieToken ||
          isTokenExpired(cookieToken) ||
          (hasNonExpiredToken && !isAuthenticated)); // Stale token case

      if (needsRefresh) {
        const tokenToUse = refreshToken || cookieRefreshToken;

        try {
          // Set refresh token first if not already set
          if (!refreshToken && cookieRefreshToken) {
            actions.setRefreshToken(cookieRefreshToken);
          }

          const response = await fetch(
            `${
              process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"
            }/api/auth/refresh`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken: tokenToUse }),
            },
          );

          if (response.ok) {
            const data = await response.json();

            const cookieOptions = {
              path: "/",
              sameSite: "lax" as const,
              secure: process.env.NODE_ENV === "production",
            };

            // Use proper expiry times from backend
            const accessTokenExpiry = getExpiryDays(
              data.accessTokenExpiresIn || "15m",
            );
            const refreshTokenExpiry = getExpiryDays(
              data.refreshTokenExpiresIn || "7d",
            );

            // Update cookies with correct expiry times
            Cookies.set("token", data.accessToken, {
              ...cookieOptions,
              expires: accessTokenExpiry,
            });
            Cookies.set("refreshToken", data.refreshToken, {
              ...cookieOptions,
              expires: refreshTokenExpiry,
            });

            // Update store
            actions.updateTokens(data.accessToken, data.refreshToken);

            // Set user if returned
            if (data.user) {
              actions.setUser(data.user);
            }

            // Update API headers
            api.defaults.headers.common[
              "Authorization"
            ] = `Bearer ${data.accessToken}`;
          } else {
            throw new Error("Refresh failed");
          }
        } catch (error) {
          console.error("Session restoration failed:", error);
          Cookies.remove("token");
          Cookies.remove("refreshToken");
          actions.logout();
        }
      }
      // Restore valid access token if missing from store
      else if (cookieToken && !token && !isTokenExpired(cookieToken)) {
        actions.setToken(cookieToken);
        api.defaults.headers.common["Authorization"] = `Bearer ${cookieToken}`;
      }
      // Restore refresh token if missing from store
      else if (cookieRefreshToken && !refreshToken) {
        actions.setRefreshToken(cookieRefreshToken);
      }
    };

    restoreSession();
  }, [_hasHydrated, token, refreshToken, actions]);

  // Sync tokens with cookies
  useEffect(() => {
    if (token) {
      const cookieToken = Cookies.get("token");
      if (!cookieToken) {
        // For syncing, use short expiry since we don't know the exact expiry
        Cookies.set("token", token, {
          expires: 1 / 24 / 4, // 15 minutes
          path: "/",
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      }
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      Cookies.remove("token");
      delete api.defaults.headers.common["Authorization"];
    }

    if (refreshToken) {
      const cookieRefreshToken = Cookies.get("refreshToken");
      if (!cookieRefreshToken) {
        // Default to 7 days for refresh token sync
        Cookies.set("refreshToken", refreshToken, {
          expires: 7,
          path: "/",
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      }
    } else {
      Cookies.remove("refreshToken");
    }
  }, [token, refreshToken]);

  // Initial session validation
  useEffect(() => {
    const validateSession = async () => {
      if (token && isAuthenticated) {
        try {
          const response = await api.get("/auth/me");
          actions.setUser(response.data.user);
        } catch (error) {
          console.error("Session validation failed", error);
          // Don't logout here - let the API interceptor handle 401s
        }
      }
    };

    validateSession();
  }, [token, isAuthenticated, actions]);

  // Trigger socket reconnection when token changes
  useEffect(() => {
    if (token && isAuthenticated) {
      setTimeout(() => {
        reconnectSocket();
      }, 100);
    }
  }, [token, isAuthenticated]);

  return { isAuthenticated, hasHydrated: _hasHydrated };
}

export function getTokenRemainingTime(token: string): number {
  try {
    const decoded: any = jwtDecode(token);
    if (!decoded.exp) return Infinity;
    const currentTime = Date.now() / 1000;
    return Math.max(0, decoded.exp - currentTime);
  } catch (error) {
    console.error("Error decoding token:", error);
    return 0;
  }
}
