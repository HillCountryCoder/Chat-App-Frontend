"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { api } from "@/lib/api";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { reconnectSocket } from "@/lib/socket";

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
  const { token, refreshToken, isAuthenticated, _hasHydrated, actions } = useAuthStore();

  // Session restoration ONLY after hydration
  useEffect(() => {
    // Wait for Zustand to hydrate before attempting session restoration
    if (!_hasHydrated) {
      console.log("🔄 Waiting for hydration...");
      return;
    }

    const restoreSession = async () => {
      console.log("🚀 Starting session restoration...");
      console.log("📊 Current state:", { 
        hasToken: !!token, 
        hasRefreshToken: !!refreshToken, 
        isAuthenticated,
        tokenExpired: token ? isTokenExpired(token) : 'no token'
      });

      const cookieToken = Cookies.get("token");
      const cookieRefreshToken = Cookies.get("refreshToken");
      
      console.log("🍪 Cookies:", { 
        hasCookieToken: !!cookieToken, 
        hasCookieRefreshToken: !!cookieRefreshToken,
        cookieTokenExpired: cookieToken ? isTokenExpired(cookieToken) : 'no cookie token'
      });

      // Check if we have a token in store that hasn't expired
      const hasNonExpiredToken = token && !isTokenExpired(token);
      console.log("🕐 Has non-expired token:", hasNonExpiredToken);
      
      // But we also need to check if it's actually valid (authenticated state)
      const shouldSkipRestoration = hasNonExpiredToken && isAuthenticated;
      console.log("🔍 Should skip restoration:", shouldSkipRestoration);

      if (shouldSkipRestoration) {
        console.log("✨ Already have valid authenticated token, skipping restoration");
        return;
      }

      // If we have a token but not authenticated, it might be stale
      if (hasNonExpiredToken && !isAuthenticated) {
        console.log("⚠️ Have token but not authenticated - token might be stale");
      }

      // If we have refresh token (either in store or cookies) and need to refresh
      const availableRefreshToken = refreshToken || cookieRefreshToken;
      const needsRefresh = availableRefreshToken && (
        !cookieToken || 
        isTokenExpired(cookieToken) || 
        (hasNonExpiredToken && !isAuthenticated) // Stale token case
      );
      
      console.log("🔄 Needs refresh:", needsRefresh, { availableRefreshToken: !!availableRefreshToken });
      
      if (needsRefresh) {
        const tokenToUse = refreshToken || cookieRefreshToken;
        try {
          console.log("🔄 Attempting token refresh...");

          // Set refresh token first if not already set
          if (!refreshToken && cookieRefreshToken) {
            console.log("📝 Setting refresh token in store");
            actions.setRefreshToken(cookieRefreshToken);
          }

          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/api/auth/refresh`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken: tokenToUse }),
            },
          );

          if (response.ok) {
            const data = await response.json();
            console.log("✅ Token refresh successful");

            const cookieOptions = {
              path: "/",
              sameSite: "lax" as const,
              secure: process.env.NODE_ENV === "production",
            };

            // Update cookies
            Cookies.set("token", data.accessToken, {
              ...cookieOptions,
              expires: 1,
            });
            Cookies.set("refreshToken", data.refreshToken, {
              ...cookieOptions,
              expires: 30,
            });

            // Update store
            actions.updateTokens(data.accessToken, data.refreshToken);
            
            // Set user if returned
            if (data.user) {
              actions.setUser(data.user);
            }

            // Update API headers
            api.defaults.headers.common["Authorization"] = `Bearer ${data.accessToken}`;

            console.log("🎉 Session restored successfully");
          } else {
            console.error("❌ Token refresh failed:", response.status);
            throw new Error("Refresh failed");
          }
        } catch (error) {
          console.error("💥 Session restoration failed:", error);
          Cookies.remove("token");
          Cookies.remove("refreshToken");
          actions.logout();
        }
      }
      // Restore valid access token if missing from store
      else if (cookieToken && !token && !isTokenExpired(cookieToken)) {
        console.log("📝 Restoring valid token from cookies to store");
        actions.setToken(cookieToken);
        api.defaults.headers.common["Authorization"] = `Bearer ${cookieToken}`;
      }
      // Restore refresh token if missing from store
      else if (cookieRefreshToken && !refreshToken) {
        console.log("📝 Restoring refresh token from cookies to store");
        actions.setRefreshToken(cookieRefreshToken);
      } else {
        console.log("ℹ️ No restoration needed");
      }
    };

    restoreSession();
  }, [_hasHydrated, token, refreshToken, actions]);

  // Sync tokens with cookies
  useEffect(() => {
    if (token) {
      const cookieToken = Cookies.get("token");
      if (!cookieToken) {
        console.log("🍪 Syncing token to cookies");
        Cookies.set("token", token, {
          expires: 1,
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
        console.log("🍪 Syncing refresh token to cookies");
        Cookies.set("refreshToken", refreshToken, {
          expires: 30,
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
          console.log("🔍 Validating session...");
          const response = await api.get("/auth/me");
          actions.setUser(response.data.user);
          console.log("✅ Session validation successful");
        } catch (error) {
          console.error("❌ Session validation failed", error);
          actions.logout();
          Cookies.remove("token");
          Cookies.remove("refreshToken");
        }
      }
    };

    validateSession();
  }, [token, isAuthenticated, actions]);

  // Trigger socket reconnection when token changes
  useEffect(() => {
    if (token && isAuthenticated) {
      console.log("🔌 Reconnecting socket...");
      setTimeout(() => {
        reconnectSocket();
      }, 100);
    }
  }, [token, isAuthenticated]);

  // Auto-refresh token when it's about to expire
  useEffect(() => {
    if (!token || !isAuthenticated) return;

    const checkTokenExpiry = () => {
      const timeRemaining = getTokenRemainingTime(token);

      // Auto-refresh when 5 minutes remaining
      if (timeRemaining < 300 && timeRemaining > 0) {
        const currentRefreshToken = Cookies.get("refreshToken");
        if (currentRefreshToken) {
          console.log("⏰ Auto-refreshing token...");
          api.get("/auth/me").catch(() => {
            // If this fails, the interceptor will handle token refresh
          });
        }
      }

      // Token expired, cleanup
      if (timeRemaining <= 0) {
        const currentRefreshToken = Cookies.get("refreshToken");
        if (!currentRefreshToken) {
          console.log("🧹 Cleaning up expired token");
          actions.logout();
          Cookies.remove("token");
          Cookies.remove("refreshToken");
        }
      }
    };

    // Check immediately and then every minute
    checkTokenExpiry();
    const interval = setInterval(checkTokenExpiry, 60000);

    return () => clearInterval(interval);
  }, [token, isAuthenticated, actions]);

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