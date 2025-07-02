import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { User } from "@/types/user";

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  expiresIn: string | null;
  _hasHydrated: boolean; // Track hydration status
  sessionInfo: {
    loginTime: string | null;
    rememberMe: boolean;
    deviceInfo: string | null;
  };
  actions: {
    setUser: (user: User | null) => void;
    setToken: (token: string | null) => void;
    setRefreshToken: (refreshToken: string | null) => void;
    setSessionInfo: (info: Partial<AuthState["sessionInfo"]>) => void;
    setHasHydrated: (state: boolean) => void;
    login: (
      user: User,
      accessToken: string,
      refreshToken: string,
      expiresIn: string,
      rememberMe?: boolean,
    ) => void;
    logout: () => void;
    updateTokens: (accessToken: string, refreshToken: string) => void;
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    immer((set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      expiresIn: null,
      _hasHydrated: false,
      sessionInfo: {
        loginTime: null,
        rememberMe: false,
        deviceInfo: null,
      },
      actions: {
        setUser: (user) =>
          set((state) => {
            state.user = user;
            state.isAuthenticated = !!user;
          }),
        setToken: (token) =>
          set((state) => {
            state.token = token;
            state.isAuthenticated = !!token;
          }),
        setRefreshToken: (refreshToken) =>
          set((state) => {
            state.refreshToken = refreshToken;
          }),
        setSessionInfo: (info) =>
          set((state) => {
            state.sessionInfo = { ...state.sessionInfo, ...info };
          }),
        setHasHydrated: (hasHydrated) =>
          set((state) => {
            state._hasHydrated = hasHydrated;
          }),
        login: (
          user,
          accessToken,
          refreshToken,
          expiresIn,
          rememberMe = false,
        ) =>
          set((state) => {
            state.user = user;
            state.token = accessToken;
            state.refreshToken = refreshToken;
            state.expiresIn = expiresIn;
            state.isAuthenticated = true;
            state.sessionInfo = {
              loginTime: new Date().toISOString(),
              rememberMe,
              deviceInfo:
                typeof navigator !== "undefined" ? navigator.userAgent : null,
            };
          }),
        logout: () =>
          set((state) => {
            state.user = null;
            state.token = null;
            state.refreshToken = null;
            state.expiresIn = null;
            state.isAuthenticated = false;
            state.sessionInfo = {
              loginTime: null,
              rememberMe: false,
              deviceInfo: null,
            };
          }),
        updateTokens: (accessToken, refreshToken) =>
          set((state) => {
            state.token = accessToken;
            state.refreshToken = refreshToken;
          }),
      },
    })),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        expiresIn: state.expiresIn,
        sessionInfo: state.sessionInfo,
      }),
      onRehydrateStorage: (state) => {
        return (state, error) => {
          if (error) {
            console.log("Hydration error:", error);
          } else {
            console.log("Hydration completed");
            // Mark hydration as complete
            state?.actions.setHasHydrated(true);
          }
        };
      },
    },
  ),
);