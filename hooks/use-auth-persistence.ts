"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { api } from "@/lib/api";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

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

export function useAuthPersistence() {
  const { token, refreshToken, isAuthenticated, actions } = useAuthStore();

  // Session restoration on app load
  useEffect(() => {
    const restoreSession = () => {
      const cookieToken = Cookies.get("token");
      const cookieRefreshToken = Cookies.get("refreshToken");
      
      // If we have cookies but no Zustand state, restore from cookies
      if (cookieToken && !token) {
        if (!isTokenExpired(cookieToken)) {
          actions.setToken(cookieToken);
          api.defaults.headers.common["Authorization"] = `Bearer ${cookieToken}`;
        } else {
          // Clean up expired tokens
          Cookies.remove("token");
          Cookies.remove("refreshToken");
          actions.logout();
        }
      }
      
      if (cookieRefreshToken && !refreshToken) {
        actions.setRefreshToken(cookieRefreshToken);
      }
    };

    restoreSession();
  }, []);

  // Sync tokens with cookies
  useEffect(() => {
    if (token) {
      const cookieToken = Cookies.get("token");
      if (!cookieToken) {
        Cookies.set("token", token, {
          expires: 1,
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
        Cookies.set("refreshToken", refreshToken, {
          expires: 30,
          path: "/",
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      }
    } else {
      Cookies.remove("refreshToken");
    }
  }, [token, refreshToken]);

  // Initial session validation
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
          Cookies.remove("refreshToken");
        }
      }
    };

    validateSession();
  }, []);

  return { isAuthenticated };
}