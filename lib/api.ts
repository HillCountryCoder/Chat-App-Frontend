/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { createErrorFromResponse } from "@/lib/errors/factory";
import { BaseError } from "@/lib/errors";
import { useAuthStore } from "@/store/auth-store";
import { isTokenExpired } from "@/hooks/use-auth-persistence";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

// Detect iframe environment
const isInIframe = typeof window !== "undefined" && window !== window.parent;

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Helper function to convert duration strings to cookie expiry days
const getExpiryDays = (duration: string): number => {
  if (duration === "15m") return 1 / 24 / 4; // 15 minutes in days
  if (duration === "7d") return 7;
  if (duration === "30d") return 30;
  return 1; // Default fallback
};

// Queue for failed requests during token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

// Track rate limit state
let isRateLimited = false;
let rateLimitUntil = 0;

const processQueue = (error: any = null, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });

  failedQueue = [];
};

// Clear auth data from store
useAuthStore.getState().actions.logout();
const clearAuthAndRedirect = () => {
  // Clear tokens based on environment
  if (isInIframe) {
    // Iframe: Clear localStorage instead of cookies
    if (typeof window !== "undefined") {
      localStorage.removeItem("chat_access_token");
      localStorage.removeItem("chat_refresh_token");
      console.log("🧹 [Iframe] Cleared tokens from localStorage");
    }
  } else {
    // Main app: Clear cookies
    Cookies.remove("token");
    Cookies.remove("refreshToken");
  }

  // Only redirect if not already on auth page and not in iframe
  if (!isInIframe && !window.location.pathname.includes("/login")) {
    window.location.href = "/login";
  } else if (isInIframe) {
    console.log(
      "🔄 [Iframe] Auth cleared, parent should handle re-authentication"
    );
    // Optionally notify parent
    window.parent.postMessage(
      {
        source: "chat-app",
        type: "AUTH_EXPIRED",
        timestamp: Date.now(),
      },
      "*"
    );
  }
};

api.interceptors.request.use((config) => {
  // First try to get token from Zustand store
  let token = useAuthStore.getState().token;

  // If in iframe and no token in store, try localStorage
  if (!token && isInIframe && typeof window !== "undefined") {
    token = Cookies.get("token") ?? null;
    console.log("📦 [Iframe] Retrieved token from localStorage");
  }

  // Validate token is not expired
  if (token && !isTokenExpired(token)) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (token) {
    console.warn("⚠️ Token is expired, clearing");
    if (isInIframe) {
      localStorage.removeItem("chat_access_token");
      localStorage.removeItem("chat_refresh_token");
    }
  }

  const tenantId = useAuthStore.getState().tenantId;
  if (tenantId) {
    config.headers["X-Tenant-ID"] = tenantId;
  }

  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Handle rate limiting (429) - stop all further requests
    if (error.response?.status === 429) {
      console.error(
        `❌ Rate limited in ${
          isInIframe ? "iframe" : "main app"
        }. Stopping requests.`
      );

      // Set rate limit flag and timestamp
      isRateLimited = true;
      rateLimitUntil = Date.now() + 60000; // Block for 1 minute

      // Process queue with rate limit error
      processQueue(new Error("Rate limited"), null);

      // Clear auth and redirect (iframe-aware)
      clearAuthAndRedirect();

      return Promise.reject(new Error("Rate limited - please try again later"));
    }

    // Don't attempt refresh if rate limited
    if (isRateLimited && Date.now() < rateLimitUntil) {
      console.log(
        `Still rate limited in ${isInIframe ? "iframe" : "main app"}`
      );
      clearAuthAndRedirect();
      return Promise.reject(new Error("Rate limited"));
    }

    // Reset rate limit flag if time has passed
    if (isRateLimited && Date.now() >= rateLimitUntil) {
      isRateLimited = false;
      rateLimitUntil = 0;
    }

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isRateLimited
    ) {
      if (isInIframe) {
        console.log("🚫 [Iframe] 401 error - attempting token refresh");

        // If already in queue, wait for refresh
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              if (token) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return api(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Try cookies first (legacy/fallback), then localStorage
          let refreshToken = Cookies.get("refreshToken");
          let storageType = "cookie";

          if (!refreshToken && typeof window !== "undefined") {
            refreshToken = localStorage.getItem("chat_refresh_token") ?? undefined;
            storageType = "localStorage";
          }

          if (!refreshToken) {
            console.log(
              "🚫 [Iframe] No refresh token found in cookies or localStorage"
            );
            clearAuthAndRedirect();
            return Promise.reject(error);
          }

          console.log(
            `🔄 [Iframe] Attempting token refresh using ${storageType}...`
          );

          const response = await axios.post(`${API_URL}/api/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;

          // Always save to localStorage (primary storage for iframe)
          if (typeof window !== "undefined") {
            localStorage.setItem("chat_access_token", accessToken);
            localStorage.setItem("chat_refresh_token", newRefreshToken);
            console.log("💾 [Iframe] Saved new tokens to localStorage");
          }

          // Update Zustand store
          useAuthStore
            .getState()
            .actions.updateTokens(accessToken, newRefreshToken);

          console.log("✅ [Iframe] Token refresh successful");

          // Process the queue
          processQueue(null, accessToken);

          // Retry the original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError: any) {
          console.error("❌ [Iframe] Token refresh failed:", refreshError);

          // Check for rate limiting
          if (refreshError.response?.status === 429) {
            isRateLimited = true;
            rateLimitUntil = Date.now() + 60000;
          }

          // Process queue with error
          processQueue(refreshError, null);

          // Clear auth
          clearAuthAndRedirect();

          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // MAIN APP STRATEGY: Attempt refresh (your existing logic)
      if (isRefreshing) {
        // Add request to queue
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = Cookies.get("refreshToken");
        if (!refreshToken) {
          throw new Error("No refresh token");
        }

        console.log("🔄 API Interceptor: Attempting token refresh...");

        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const {
          accessToken,
          refreshToken: newRefreshToken,
          accessTokenExpiresIn,
          refreshTokenExpiresIn,
        } = response.data;

        // Update cookies with proper expiry times
        const cookieOptions = {
          path: "/",
          sameSite: "lax" as const,
          secure: process.env.NODE_ENV === "production",
        };

        const accessTokenExpiry = getExpiryDays(accessTokenExpiresIn || "15m");
        const refreshTokenExpiry = getExpiryDays(refreshTokenExpiresIn || "7d");

        Cookies.set("token", accessToken, {
          ...cookieOptions,
          expires: accessTokenExpiry,
        });
        Cookies.set("refreshToken", newRefreshToken, {
          ...cookieOptions,
          expires: refreshTokenExpiry,
        });

        // Update Zustand store
        useAuthStore
          .getState()
          .actions.updateTokens(accessToken, newRefreshToken);

        console.log("✅ API Interceptor: Token refresh successful");

        // Process the queue
        processQueue(null, accessToken);

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError: any) {
        console.error(
          "❌ API Interceptor: Token refresh failed:",
          refreshError
        );

        // Check if refresh failed due to rate limiting
        if (refreshError.response?.status === 429) {
          console.error("Refresh token endpoint rate limited");
          isRateLimited = true;
          rateLimitUntil = Date.now() + 60000; // Block for 1 minute
        }

        // Process queue with error
        processQueue(refreshError, null);

        // Clear auth and redirect
        clearAuthAndRedirect();

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const appError = createErrorFromResponse(error);
    return Promise.reject(appError);
  }
);

export async function apiRequest<T = any>(
  config: AxiosRequestConfig
): Promise<T> {
  try {
    console.log("🔄 API requests making to backend SSO");
    const response = await api(config);
    console.log("✅ API request successful:", response);
    return response.data;
  } catch (error) {
    if (error instanceof BaseError) {
      throw error;
    }
    throw createErrorFromResponse(error);
  }
}

export const apiClient = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) =>
    apiRequest<T>({ ...config, method: "GET", url }),
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiRequest<T>({ ...config, method: "POST", url, data }),
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiRequest<T>({ ...config, method: "PUT", url, data }),
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiRequest<T>({ ...config, method: "PATCH", url, data }),
  delete: <T = any>(url: string, config?: AxiosRequestConfig) =>
    apiRequest<T>({ ...config, method: "DELETE", url }),
};
