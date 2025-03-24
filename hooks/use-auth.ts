import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { LoginFormData, RegisterFormData } from "@/lib/validators";
import { connectSocket } from "@/lib/socket";

export function useLogin() {
  const { actions } = useAuthStore();

  return useMutation({
    mutationFn: async (data: LoginFormData) => {
      const loggedInUser = await api.post("/auth/login", data);
      return loggedInUser.data;
    },
    onSuccess: (data) => {
      actions.login(data.user, data.token);
      connectSocket();
    },
  });
}

export function useRegister() {
  const { actions } = useAuthStore();

  return useMutation({
    mutationFn: async (data: RegisterFormData) => {
      const registeredUser = await api.post("/auth/register", data);
      return registeredUser.data;
    },
    onSuccess: (data) => {
      actions.login(data.user, data.token);
      connectSocket();
    },
  });
}
export function useLogout() {
  const { actions } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      return true; // No need for API call if using JWT
    },
    onSuccess: () => {
      actions.logout();
    },
  });
}
