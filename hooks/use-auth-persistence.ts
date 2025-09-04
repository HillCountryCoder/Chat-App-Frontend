"use client";

import { useEffect, useRef } from "react";
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

// Iframe-specific tracking
let iframeRefreshAttempted = false;

export function useAuthPersistence() {
  const { token, refreshToken, isAuthenticated, _hasHydrated, actions } =
    useAuthStore();

  const isRestoringRef = useRef(false);

  // Session restoration ONLY after hydration
  useEffect(() => {
    if (!_hasHydrated || isRestoringRef.current) return;

    const restoreSession = async () => {
      try {
        isRestoringRef.current = true;

        const cookieToken = Cookies.get("token");
        const cookieRefreshToken = Cookies.get("refreshToken");

        console.log(
          `🔍 Auth restoration - Environment: ${
            isInIframe ? "iframe" : "standalone"
          }`,
        );

        // Check if we have a token in store that hasn't expired
        const hasNonExpiredToken = token && !isTokenExpired(token);

        // But we also need to check if it's actually valid (authenticated state)
        const shouldSkipRestoration = hasNonExpiredToken && isAuthenticated;

        if (shouldSkipRestoration) {
          console.log("✅ Already authenticated with valid token");
          return;
        }

        // IFRAME STRATEGY: Be very conservative
        if (isInIframe) {
          // Prevent multiple attempts in the same iframe session
          if (iframeRefreshAttempted) {
            console.log("🚫 Iframe refresh already attempted, skipping");
            return;
          }

          // Strategy 1: Check if we have a valid access token in cookies
          if (cookieToken && !isTokenExpired(cookieToken)) {
            console.log("✅ Found valid access token in iframe, using it");
            actions.setToken(cookieToken);

            // Also restore refresh token if available
            if (cookieRefreshToken && !refreshToken) {
              actions.setRefreshToken(cookieRefreshToken);
            }

            // Set API headers
            api.defaults.headers.common[
              "Authorization"
            ] = `Bearer ${cookieToken}`;
            return;
          }

          // Strategy 2: If no valid access token, DON'T attempt refresh in iframe
          console.log("⚠️ No valid token in iframe, requiring fresh login");
          iframeRefreshAttempted = true;

          // Clear any stale auth data
          actions.logout();

          // Don't redirect in iframe, let the component handle login UI
          console.log("💡 Iframe needs authentication - will show login UI");
          return;
        }

        // STANDALONE APP STRATEGY: Full restoration logic (your existing logic)
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

            // Increment attempt counter and update timestamp
            refreshAttempts++;
            lastRefreshAttempt = now;

            console.log(
              `🔄 Attempting token refresh (${refreshAttempts}/${MAX_REFRESH_ATTEMPTS})`,
            );

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

            // Handle rate limiting specifically
            if (response.status === 429) {
              console.error("❌ Rate limited during session restore");
              throw new Error("Rate limited");
            }

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

            // For other errors, don't immediately redirect, let other mechanisms handle it
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
  }, [_hasHydrated, token, refreshToken, actions]);

  // Sync tokens with cookies (skip in iframe mode to prevent conflicts)
  useEffect(() => {
    if (isInIframe) {
      console.log("🚫 Skipping cookie sync in iframe mode");

      // Still set API headers if we have a token
      if (token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      } else {
        delete api.defaults.headers.common["Authorization"];
      }
      return;
    }

    // Regular cookie sync for standalone app
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

  // Initial session validation (throttled for iframes)
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

    if (isInIframe) {
      // Throttle validation for iframes
      const timeout = setTimeout(validateSession, 1000);
      return () => clearTimeout(timeout);
    } else {
      validateSession();
    }
  }, [token, isAuthenticated, actions]);

  // Trigger socket reconnection when token changes (skip for iframes)
  useEffect(() => {
    if (token && isAuthenticated && !isInIframe) {
      setTimeout(() => {
        reconnectSocket();
      }, 100);
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
