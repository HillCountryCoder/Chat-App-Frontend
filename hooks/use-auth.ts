import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiClient } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { LoginFormData, RegisterFormData } from "@/lib/validators";
import Cookies from "js-cookie";
import { BaseError } from "@/lib/errors";

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
      const { user, accessToken, refreshToken, expiresIn } = data;

      const cookieOptions = {
        path: "/",
        sameSite: "strict" as const,
        secure: process.env.NODE_ENV === "production",
      };

      // Store access token (short-lived - 15 minutes)
      Cookies.set("token", accessToken, {
        ...cookieOptions,
        expires: 1, // 1 day (but token expires in 15 mins)
      });

      // Store refresh token (duration based on rememberMe)
      const refreshTokenExpiry = expiresIn === "30d" ? 30 : 7;
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
        expiresIn === "30d", // rememberMe = true if expiresIn is 30d
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
      const { user, accessToken, refreshToken, expiresIn } = data;

      const cookieOptions = {
        path: "/",
        sameSite: "strict" as const,
        secure: process.env.NODE_ENV === "production",
      };

      // Store access token
      Cookies.set("token", accessToken, {
        ...cookieOptions,
        expires: 1,
      });

      // Store refresh token
      const refreshTokenExpiry = expiresIn === "30d" ? 30 : 7;
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