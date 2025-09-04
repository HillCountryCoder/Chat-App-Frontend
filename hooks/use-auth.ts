import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiClient } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { LoginFormData, RegisterFormData } from "@/lib/validators";
import Cookies from "js-cookie";
import { BaseError } from "@/lib/errors";
import { getExpiryDays } from "@/utils/date-utils";
import { useEffect, useState } from "react";

export function useLogin() {
  const { actions } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LoginFormData) => {
      try {
        const response = await apiClient.post("/auth/login", data);
        return response;
      } catch (error) {
        if (error instanceof BaseError) {
          throw error;
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      const {
        user,
        accessToken,
        refreshToken,
        expiresIn,
        accessTokenExpiresIn,
        refreshTokenExpiresIn,
      } = data;

      const isInIframe = window !== window.parent;

      const cookieOptions = {
        path: "/",
        // Change SameSite to None for iframe context
        sameSite: isInIframe ? ("none" as const) : ("strict" as const),
        // Must be secure when sameSite is None
        secure: isInIframe ? true : process.env.NODE_ENV === "production",
        // Add partitioned attribute for third-party contexts
        ...(isInIframe && { partitioned: true }),
      };

      // Use proper expiry times from backend
      const accessTokenExpiry = getExpiryDays(accessTokenExpiresIn || "15m");
      const refreshTokenExpiry = getExpiryDays(
        refreshTokenExpiresIn || expiresIn || "7d",
      );

      // Store tokens with correct expiry times
      Cookies.set("token", accessToken, {
        ...cookieOptions,
        expires: accessTokenExpiry,
      });

      Cookies.set("refreshToken", refreshToken, {
        ...cookieOptions,
        expires: refreshTokenExpiry,
      });

      // Update Zustand store
      actions.login(
        user,
        accessToken,
        refreshToken,
        expiresIn,
        expiresIn === "30d",
      );

      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useRegister() {
  const { actions } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RegisterFormData) => {
      try {
        const response = await apiClient.post("/auth/register", data);
        return response;
      } catch (error) {
        if (error instanceof BaseError) {
          throw error;
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      const {
        user,
        accessToken,
        refreshToken,
        expiresIn,
        accessTokenExpiresIn,
        refreshTokenExpiresIn,
      } = data;

      const cookieOptions = {
        path: "/",
        sameSite: "strict" as const,
        secure: process.env.NODE_ENV === "production",
      };

      // Use proper expiry times from backend
      const accessTokenExpiry = getExpiryDays(accessTokenExpiresIn || "15m");
      const refreshTokenExpiry = getExpiryDays(
        refreshTokenExpiresIn || expiresIn || "7d",
      );

      // Store tokens with correct expiry times
      Cookies.set("token", accessToken, {
        ...cookieOptions,
        expires: accessTokenExpiry,
      });

      Cookies.set("refreshToken", refreshToken, {
        ...cookieOptions,
        expires: refreshTokenExpiry,
      });

      // Update Zustand store
      actions.login(
        user,
        accessToken,
        refreshToken,
        expiresIn,
        expiresIn === "30d",
      );

      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useLogout() {
  const { actions } = useAuthStore();
  const [isInIframe, setIsInIframe] = useState(false);

  // Check iframe status safely on client side only
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsInIframe(window !== window.parent);
    }
  }, []);

  return useMutation({
    mutationFn: async (data?: { refreshToken?: string }) => {
      // For iframe with expired tokens, do local logout only
      if (isInIframe) {
        try {
          const refreshToken =
            data?.refreshToken || Cookies.get("refreshToken");

          if (!refreshToken) {
            console.log("No refresh token available, doing local logout only");
            return { success: true, message: "Logged out locally" };
          }

          // Try server logout, but don't fail if it doesn't work
          const response = await apiClient.post("/auth/logout", {
            refreshToken,
          });
          return response;
        } catch (error) {
          console.log(
            "Server logout failed in iframe, proceeding with local logout",
            error,
          );
          return { success: true, message: "Logged out locally" };
        }
      } else {
        // Regular logout for main app
        const refreshToken = data?.refreshToken || Cookies.get("refreshToken");
        return await apiClient.post("/auth/logout", { refreshToken });
      }
    },
    onSuccess: () => {
      // Clear local state regardless of server response
      actions.logout();
      Cookies.remove("token");
      Cookies.remove("refreshToken");

      // Only do client-side navigation after component has mounted
      if (typeof window !== "undefined") {
        if (isInIframe) {
          // Notify parent that user logged out
          try {
            window.parent.postMessage(
              {
                source: "chat-app",
                type: "USER_LOGGED_OUT",
                payload: { timestamp: Date.now() },
              },
              "*",
            );
          } catch (e) {
            console.log("Could not notify parent of logout", e);
          }

          // Redirect to login in iframe
          window.location.href = "/login?iframe=true";
        } else {
          // Regular redirect for main app
          window.location.href = "/login";
        }
      }
    },
    onError: (error) => {
      console.error("Logout error:", error);

      // Even if logout fails, clear local state
      actions.logout();
      Cookies.remove("token");
      Cookies.remove("refreshToken");

      // Only do client-side navigation after component has mounted
      if (typeof window !== "undefined") {
        if (isInIframe) {
          window.location.href = "/login?iframe=true";
        } else {
          window.location.href = "/login";
        }
      }
    },
  });
}

export function useLogoutAll() {
  const { actions } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.post("/auth/logout-all");
      return true;
    },
    onSuccess: () => {
      // Remove both tokens
      Cookies.remove("token");
      Cookies.remove("refreshToken");

      // Clear auth data from Zustand
      actions.logout();

      // Clear any user-specific cached queries
      queryClient.clear();
    },
  });
}

export function useUser() {
  const { isAuthenticated, token } = useAuthStore();
  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data } = await api.get("/auth/me");
      return data.user;
    },
    enabled: isAuthenticated && !!token,
  });
}

export function useActiveSessions() {
  const { isAuthenticated, token } = useAuthStore();
  return useQuery({
    queryKey: ["active-sessions"],
    queryFn: async () => {
      const { data } = await api.get("/auth/sessions");
      return data.sessions;
    },
    enabled: isAuthenticated && !!token,
  });
}
