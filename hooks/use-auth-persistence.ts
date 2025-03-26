// hooks/use-auth-persistence.ts
import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { api } from "@/lib/api";
import Cookies from "js-cookie";

export function useAuthPersistence() {
  const { token, isAuthenticated, actions } = useAuthStore();

  // Ensure cookie is set if we have a token in Zustand store
  useEffect(() => {
    if (token) {
      const cookieToken = Cookies.get("token");
      if (!cookieToken) {
        Cookies.set("token", token, {
          expires: 7,
          path: "/",
          sameSite: "lax",
        });
      }

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      Cookies.remove("token");
      delete api.defaults.headers.common["Authorization"];
    }
  }, [token]);

  useEffect(() => {
    const validateSession = async () => {
      if (token && isAuthenticated) {
        try {
          const response = await api.get("/auth/me");
          actions.setUser(response.data.user);
        } catch (error) {
          console.error("Session validation failed", error);
          actions.logout();
          Cookies.remove("token");
        }
      }
    };

    validateSession();
  }, []);

  return { isAuthenticated };
}
