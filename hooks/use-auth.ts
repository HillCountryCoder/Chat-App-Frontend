// hooks/use-auth.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { LoginFormData, RegisterFormData } from "@/lib/validators";
// import { connectSocket } from "@/lib/socket";
import Cookies from "js-cookie";
export function useLogin() {
  const { actions } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await api.post("/auth/login", data);
      return response.data;
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

      // Connect to the WebSocket
      //   connectSocket();

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
      const response = await api.post("/auth/register", data);
      return response.data;
    },
    onSuccess: (data) => {
      // Persist auth data using Zustand
      actions.login(data.user, data.token);

      //   connectSocket();

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
