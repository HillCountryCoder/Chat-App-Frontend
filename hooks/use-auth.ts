import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiClient } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { LoginFormData, RegisterFormData } from "@/lib/validators";
import Cookies from "js-cookie";
import { BaseError } from "@/lib/errors";

// Helper function to convert duration strings to cookie expiry days
const getExpiryDays = (duration: string): number => {
  if (duration === "15m") return 1 / 24 / 4; // 15 minutes in days
  if (duration === "7d") return 7;
  if (duration === "30d") return 30;
  return 1; // Default fallback
};

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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const refreshToken = Cookies.get("refreshToken");
      if (refreshToken) {
        try {
          await apiClient.post("/auth/logout", { refreshToken });
        } catch (error) {
          // Continue with logout even if server request fails
          console.error("Server logout failed:", error);
        }
      }
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
  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data } = await api.get("/auth/me");
      return data.user;
    },
    enabled: !!useAuthStore.getState().isAuthenticated,
  });
}

export function useActiveSessions() {
  return useQuery({
    queryKey: ["active-sessions"],
    queryFn: async () => {
      const { data } = await api.get("/auth/sessions");
      return data.sessions;
    },
    enabled: !!useAuthStore.getState().isAuthenticated,
  });
}
