"use client";

import { useEffect, useRef, useCallback } from "react";
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

// Detect if running in iframe
const isInIframe = typeof window !== "undefined" && window !== window.parent;

// Track refresh attempts to prevent infinite loops
let refreshAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 3;
let lastRefreshAttempt = 0;
const REFRESH_COOLDOWN = 60000; // 1 minute cooldown between attempts

// Iframe-specific tracking - use more specific flags
let iframeInitialized = false;
let sessionRestoreAttempted = false;

export function useAuthPersistence() {
  const { token, refreshToken, isAuthenticated, _hasHydrated, actions } =
    useAuthStore();

  const isRestoringRef = useRef(false);
  const cookieSyncRef = useRef(false);
  const sessionValidatedRef = useRef(false);

  // Memoize cookie operations to prevent unnecessary re-runs
  const syncTokensWithCookies = useCallback(() => {
    if (isInIframe) {
      console.log("🚫 Skipping cookie sync in iframe mode");

      // Only set API headers if we have a token
      if (token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      } else {
        delete api.defaults.headers.common["Authorization"];
      }
      return;
    }

    // Prevent multiple sync operations
    if (cookieSyncRef.current) return;
    cookieSyncRef.current = true;

    try {
      // Regular cookie sync for standalone app
      if (token) {
        const cookieToken = Cookies.get("token");
        if (!cookieToken) {
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
    } finally {
      // Reset the flag after a brief delay
      setTimeout(() => {
        cookieSyncRef.current = false;
      }, 100);
    }
  }, [token, refreshToken]);

  // Session restoration - SINGLE useEffect with proper dependencies
  useEffect(() => {
    // Prevent multiple restoration attempts
    if (!_hasHydrated || isRestoringRef.current || sessionRestoreAttempted) {
      return;
    }

    const restoreSession = async () => {
      try {
        isRestoringRef.current = true;
        sessionRestoreAttempted = true;

        const cookieToken = Cookies.get("token");
        const cookieRefreshToken = Cookies.get("refreshToken");

        console.log(
          `🔍 Auth restoration - Environment: ${
            isInIframe ? "iframe" : "standalone"
          }`,
        );

        // Check if we have a token in store that hasn't expired
        const hasNonExpiredToken = token && !isTokenExpired(token);
        const shouldSkipRestoration = hasNonExpiredToken && isAuthenticated;

        if (shouldSkipRestoration) {
          console.log("✅ Already authenticated with valid token");
          return;
        }

        // IFRAME STRATEGY: Be very conservative
        // IFRAME STRATEGY: Allow refresh attempts
        if (isInIframe) {
          // Check if we have a valid access token in cookies
          if (cookieToken && !isTokenExpired(cookieToken)) {
            console.log("✅ Found valid access token in iframe, using it");
            actions.setToken(cookieToken);

            if (cookieRefreshToken && !refreshToken) {
              actions.setRefreshToken(cookieRefreshToken);
            }

            api.defaults.headers.common[
              "Authorization"
            ] = `Bearer ${cookieToken}`;
            return;
          }

          // If access token expired but refresh token exists, attempt refresh
          if (
            cookieRefreshToken &&
            (!cookieToken || isTokenExpired(cookieToken))
          ) {
            console.log("🔄 [Iframe] Access token expired, attempting refresh");

            try {
              const response = await api.post("/auth/refresh", {
                refreshToken: cookieRefreshToken,
              });

              if (response.status === 200 && response.data?.accessToken) {
                const data = response.data;

                const cookieOptions = {
                  path: "/",
                  sameSite: "none" as const,
                  secure: true,
                  partitioned: true,
                };

                const accessTokenExpiry = getExpiryDays(
                  data.accessTokenExpiresIn || "15m",
                );
                const refreshTokenExpiry = getExpiryDays(
                  data.refreshTokenExpiresIn || "7d",
                );

                Cookies.set("token", data.accessToken, {
                  ...cookieOptions,
                  expires: accessTokenExpiry,
                });
                Cookies.set("refreshToken", data.refreshToken, {
                  ...cookieOptions,
                  expires: refreshTokenExpiry,
                });

                actions.updateTokens(data.accessToken, data.refreshToken);

                if (data.user) {
                  actions.setUser(data.user);
                }

                api.defaults.headers.common[
                  "Authorization"
                ] = `Bearer ${data.accessToken}`;

                console.log("✅ [Iframe] Token refresh successful");
                return;
              }
            } catch (error: any) {
              console.error("❌ [Iframe] Token refresh failed:", error);
              // Fall through to logout
            }
          }

          // No valid tokens available
          console.log(
            "⚠️ [Iframe] No valid tokens, requiring fresh authentication",
          );
          actions.logout();
          return;
        }

        // STANDALONE APP STRATEGY: Full restoration logic
        console.log("🔄 Standalone app - proceeding with full restoration");

        // Check cooldown period for refresh attempts
        const now = Date.now();
        if (now - lastRefreshAttempt < REFRESH_COOLDOWN) {
          console.log("Refresh cooldown active, skipping restore attempt");
          return;
        }

        // Reset attempts if enough time has passed
        if (now - lastRefreshAttempt > REFRESH_COOLDOWN * 2) {
          refreshAttempts = 0;
        }

        // Check if we've exceeded max attempts
        if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
          console.error("Max refresh attempts exceeded, clearing auth");
          Cookies.remove("token");
          Cookies.remove("refreshToken");
          actions.logout();
          window.location.href = "/login";
          return;
        }

        // If we have refresh token and need to refresh
        const availableRefreshToken = refreshToken || cookieRefreshToken;
        const needsRefresh =
          availableRefreshToken &&
          (!token || isTokenExpired(token)) &&
          cookieRefreshToken;

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

              // Cookie options based on environment
              const cookieOptions = {
                path: "/",
                sameSite: isInIframe ? ("none" as const) : ("lax" as const),
                secure: isInIframe
                  ? true
                  : process.env.NODE_ENV === "production",
                ...(isInIframe ? { partitioned: true } : {}),
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

              // Reset attempt counter on success
              refreshAttempts = 0;
              console.log("✅ Session restore successful");
            } else {
              throw new Error(`Refresh failed with status: ${response.status}`);
            }
          } catch (error: any) {
            console.error("❌ Session restoration failed:", error);

            // If rate limited or max attempts reached, clear everything
            if (
              error.message === "Rate limited" ||
              refreshAttempts >= MAX_REFRESH_ATTEMPTS
            ) {
              console.log("Clearing auth due to rate limit or max attempts");
              Cookies.remove("token");
              Cookies.remove("refreshToken");
              actions.logout();
              window.location.href = "/login";
              return;
            }

            // For other errors, don't immediately redirect
            console.log("Session restore failed, but not clearing auth yet");
          }
        }
        // Restore valid access token if missing from store
        else if (cookieToken && !token && !isTokenExpired(cookieToken)) {
          actions.setToken(cookieToken);
          api.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${cookieToken}`;
        }
        // Restore refresh token if missing from store
        else if (cookieRefreshToken && !refreshToken) {
          actions.setRefreshToken(cookieRefreshToken);
        }
      } finally {
        isRestoringRef.current = false;
      }
    };

    restoreSession();
  }, [_hasHydrated]); // MINIMAL DEPENDENCIES - only trigger on hydration

  // Cookie sync - separate useEffect with stable dependencies
  useEffect(() => {
    syncTokensWithCookies();
  }, [syncTokensWithCookies]);

  // Session validation - only run once after successful auth
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
          sessionValidatedRef.current = false; // Allow retry on next auth change
        }
      }
    };

    if (isInIframe) {
      // Throttle validation for iframes
      const timeout = setTimeout(validateSession, 1000);
      return () => clearTimeout(timeout);
    } else {
      validateSession();
    }
  }, [token, isAuthenticated, actions]);

  // Socket reconnection - minimal and non-interfering
  useEffect(() => {
    if (token && isAuthenticated && !isInIframe) {
      const timeout = setTimeout(() => {
        reconnectSocket();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [token && isAuthenticated]); // Combine conditions to reduce triggers

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
