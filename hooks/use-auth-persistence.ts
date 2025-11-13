"use client";

import { useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { reconnectSocket } from "@/lib/socket";
import { getExpiryDays } from "@/utils/date-utils";
import { useAuthStore } from "@/store/auth-store";

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

// Detect if running in iframe
const isInIframe = typeof window !== "undefined" && window !== window.parent;

// Track refresh attempts
let refreshAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 3;
let lastRefreshAttempt = 0;
const REFRESH_COOLDOWN = 60000;

// Storage keys for iframe
const IFRAME_TOKEN_KEY = "chat_access_token";
const IFRAME_REFRESH_TOKEN_KEY = "chat_refresh_token";

// Helper functions for iframe storage
const setIframeToken = (token: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(IFRAME_TOKEN_KEY, token);
    console.log("💾 [Iframe] Saved token to localStorage");
  }
};

const setIframeRefreshToken = (refreshToken: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(IFRAME_REFRESH_TOKEN_KEY, refreshToken);
    console.log("💾 [Iframe] Saved refreshToken to localStorage");
  }
};

const getIframeToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(IFRAME_TOKEN_KEY);
};

const getIframeRefreshToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(IFRAME_REFRESH_TOKEN_KEY);
};

const clearIframeTokens = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(IFRAME_TOKEN_KEY);
    localStorage.removeItem(IFRAME_REFRESH_TOKEN_KEY);
    console.log("🧹 [Iframe] Cleared tokens from localStorage");
  }
};

export function useAuthPersistence() {
  const { token, refreshToken, isAuthenticated, _hasHydrated, actions } =
    useAuthStore();

  const isRestoringRef = useRef(false);
  const cookieSyncRef = useRef(false);
  const sessionValidatedRef = useRef(false);

  // Sync tokens to storage (cookies or localStorage)
  const syncTokensWithStorage = useCallback(() => {
    if (cookieSyncRef.current) return;
    cookieSyncRef.current = true;

    try {
      if (isInIframe) {
        // IFRAME: Use localStorage
        if (token) {
          setIframeToken(token);
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        } else {
          delete api.defaults.headers.common["Authorization"];
        }

        if (refreshToken) {
          setIframeRefreshToken(refreshToken);
        }
      } else {
        // STANDALONE: Use cookies
        if (token) {
          const cookieToken = Cookies.get("token");
          if (!cookieToken) {
            Cookies.set("token", token, {
              expires: 1 / 24 / 4,
              path: "/",
              sameSite: "lax",
              secure: window.location.protocol === "https:",
            });
            console.log("✅ Set token cookie (standalone)");
          }
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        } else {
          delete api.defaults.headers.common["Authorization"];
        }

        if (refreshToken) {
          const cookieRefreshToken = Cookies.get("refreshToken");
          if (!cookieRefreshToken) {
            Cookies.set("refreshToken", refreshToken, {
              expires: 7,
              path: "/",
              sameSite: "lax",
              secure: window.location.protocol === "https:",
            });
            console.log("✅ Set refreshToken cookie (standalone)");
          }
        } else {
          Cookies.remove("refreshToken");
        }
      }
    } finally {
      setTimeout(() => {
        cookieSyncRef.current = false;
      }, 100);
    }
  }, [token, refreshToken]);

  // Session restoration
  useEffect(() => {
    if (!_hasHydrated || isRestoringRef.current) return;

    const restoreSession = async () => {
      try {
        isRestoringRef.current = true;

        // Get tokens from storage (iframe or cookies)
        const storageToken = isInIframe
          ? getIframeToken()
          : Cookies.get("token");
        const storageRefreshToken = isInIframe
          ? getIframeRefreshToken()
          : Cookies.get("refreshToken");

        console.log(
          `🔍 Auth restoration - ${isInIframe ? "Iframe" : "Standalone"}`,
          {
            hasStorageToken: !!storageToken,
            hasStorageRefreshToken: !!storageRefreshToken,
            hasStoreToken: !!token,
            hasStoreRefreshToken: !!refreshToken,
            isAuthenticated,
          }
        );

        // Skip if already authenticated with valid token
        const hasNonExpiredToken = token && !isTokenExpired(token);
        if (hasNonExpiredToken && isAuthenticated) {
          console.log("✅ Already authenticated with valid token");
          return;
        }

        // Restore tokens from storage if missing from store
        if (!token && storageToken && !isTokenExpired(storageToken)) {
          console.log(
            `♻️ Restoring tokens from ${
              isInIframe ? "localStorage" : "cookies"
            }`
          );
          actions.updateTokens(
            storageToken,
            storageRefreshToken || refreshToken || ""
          );
          api.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${storageToken}`;
          return;
        }

        // Restore refresh token only
        if (!refreshToken && storageRefreshToken && token) {
          console.log(
            `♻️ Restoring refreshToken from ${
              isInIframe ? "localStorage" : "cookies"
            }`
          );
          actions.setRefreshToken(storageRefreshToken);
        }

        // Token refresh logic
        const now = Date.now();
        if (now - lastRefreshAttempt < REFRESH_COOLDOWN) {
          console.log("Refresh cooldown active");
          return;
        }

        if (now - lastRefreshAttempt > REFRESH_COOLDOWN * 2) {
          refreshAttempts = 0;
        }

        if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
          console.error("Max refresh attempts exceeded");
          if (isInIframe) {
            clearIframeTokens();
          } else {
            Cookies.remove("token");
            Cookies.remove("refreshToken");
          }
          actions.logout();
          if (!isInIframe) window.location.href = "/login";
          return;
        }

        // Attempt token refresh
        const availableRefreshToken = refreshToken || storageRefreshToken;
        const needsRefresh =
          availableRefreshToken &&
          (!token || isTokenExpired(token)) &&
          storageRefreshToken;

        if (needsRefresh) {
          console.log("🔄 Attempting token refresh...");
          refreshAttempts++;
          lastRefreshAttempt = now;

          try {
            const response = await api.post("/auth/refresh", {
              refreshToken: availableRefreshToken,
            });

            if (response.status === 200 && response.data?.accessToken) {
              const data = response.data;

              // Save to appropriate storage
              if (isInIframe) {
                setIframeToken(data.accessToken);
                setIframeRefreshToken(data.refreshToken);
              } else {
                const accessTokenExpiry = getExpiryDays(
                  data.accessTokenExpiresIn || "15m"
                );
                const refreshTokenExpiry = getExpiryDays(
                  data.refreshTokenExpiresIn || "7d"
                );

                Cookies.set("token", data.accessToken, {
                  expires: accessTokenExpiry,
                  path: "/",
                  sameSite: "lax",
                  secure: process.env.NODE_ENV === "production",
                });
                Cookies.set("refreshToken", data.refreshToken, {
                  expires: refreshTokenExpiry,
                  path: "/",
                  sameSite: "lax",
                  secure: process.env.NODE_ENV === "production",
                });
              }

              actions.updateTokens(data.accessToken, data.refreshToken);
              if (data.user) actions.setUser(data.user);

              api.defaults.headers.common[
                "Authorization"
              ] = `Bearer ${data.accessToken}`;
              refreshAttempts = 0;
              console.log("✅ Session restore successful");
            }
          } catch (error: any) {
            console.error("❌ Session restoration failed:", error);

            if (
              error.message === "Rate limited" ||
              refreshAttempts >= MAX_REFRESH_ATTEMPTS
            ) {
              if (isInIframe) {
                clearIframeTokens();
              } else {
                Cookies.remove("token");
                Cookies.remove("refreshToken");
              }
              actions.logout();
              if (!isInIframe) window.location.href = "/login";
            }
          }
        }
      } finally {
        isRestoringRef.current = false;
      }
    };

    restoreSession();
  }, [_hasHydrated]);

  // Sync tokens to storage
  useEffect(() => {
    syncTokensWithStorage();
  }, [syncTokensWithStorage]);

  // Session validation
  useEffect(() => {
    if (sessionValidatedRef.current) return;

    const validateSession = async () => {
      if (token && isAuthenticated) {
        sessionValidatedRef.current = true;

        try {
          const response = await api.get("/auth/me");
          actions.setUser(response.data.user);
        } catch (error) {
          console.error("Session validation failed", error);
          sessionValidatedRef.current = false;
        }
      }
    };

    const timeout = setTimeout(validateSession, isInIframe ? 1000 : 0);
    return () => clearTimeout(timeout);
  }, [token, isAuthenticated, actions]);

  // Socket reconnection
  useEffect(() => {
    if (token && isAuthenticated && !isInIframe) {
      const timeout = setTimeout(() => reconnectSocket(), 100);
      return () => clearTimeout(timeout);
    }
  }, [token, isAuthenticated]);

  return {
    isAuthenticated,
    hasHydrated: _hasHydrated,
    isInIframe,
  };
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

// Export helper to get token from iframe storage
export const getTokenFromStorage = (): string | null => {
  if (!isInIframe || typeof window === "undefined") return null;
  const token = getIframeToken();
  return token && !isTokenExpired(token) ? token : null;
};
