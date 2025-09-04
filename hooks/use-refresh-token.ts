"use client";

import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { apiClient } from "@/lib/api";
import Cookies from "js-cookie";

export function useTokenRefresh() {
  const { actions } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      const refreshToken = Cookies.get("refreshToken");
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await apiClient.post("/auth/refresh", { refreshToken });
      return response;
    },
    onSuccess: (data) => {
      const isInIframe = window !== window.parent;
      const { accessToken, refreshToken } = data;

      const cookieOptions = {
        path: "/",
        sameSite: isInIframe ? "none" as const : "strict" as const,
        secure: isInIframe ? true : (process.env.NODE_ENV === "production"),
        ...(isInIframe && { partitioned: true }),
      };

      // Update cookies
      Cookies.set("token", accessToken, {
        ...cookieOptions,
        expires: 1,
      });

      Cookies.set("refreshToken", refreshToken, {
        ...cookieOptions,
        expires: 30, // Keep same expiry for refresh token
      });

      // Update store
      actions.updateTokens(accessToken, refreshToken);
    },
    onError: (error) => {
      console.error("Token refresh failed:", error);
      // If refresh fails, logout user
      actions.logout();
      Cookies.remove("token");
      Cookies.remove("refreshToken");
    },
  });
}
