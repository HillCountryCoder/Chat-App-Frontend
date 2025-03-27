// src/hooks/use-auth.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
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
        // The error is already transformed to a BaseError by our API client
        if (error instanceof BaseError) {
          throw error;
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      // Store token in cookie - accessible to middleware
      Cookies.set("token", data.token, {
        expires: 7, // 7 days
        path: "/",
        sameSite: "strict",
      });

      // Also store in Zustand for client-side usage
      actions.login(data.user, data.token);

      // Invalidate any queries that might depend on authentication
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
        // The error is already transformed to a BaseError by our API client
        if (error instanceof BaseError) {
          throw error;
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      // Store token in cookie - accessible to middleware
      Cookies.set("token", data.token, {
        expires: 7, // 7 days
        path: "/",
        sameSite: "strict",
      });

      // Persist auth data using Zustand
      actions.login(data.user, data.token);

      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useLogout() {
  const { actions } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return true;
    },
    onSuccess: () => {
      // Remove the cookie
      Cookies.remove("token");

      // Clear auth data from Zustand
      actions.logout();

      // Clear any user-specific cached queries
      queryClient.clear();
    },
  });
}
