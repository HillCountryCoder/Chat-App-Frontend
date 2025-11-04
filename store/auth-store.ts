import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { User } from "@/types/user";
import { Tenant } from "@/types/tenant";

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  expiresIn: string | null;
  _hasHydrated: boolean; // Track hydration status
  tenantId: string | null;
  tenant: Tenant | null;
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
      tenant?: Tenant,
    ) => void;
    logout: () => void;
    updateTokens: (accessToken: string, refreshToken: string) => void;
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    immer((set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      expiresIn: null,
      _hasHydrated: false,
      tenantId: null,
      tenant: null,
      sessionInfo: {
        loginTime: null,
        rememberMe: false,
        deviceInfo: null,
      },
      actions: {
        setUser: (user) =>
          set((state) => {
            console.log("🔄 Auth Store: Setting user");
            state.user = user;
            // Update isAuthenticated based on both user and token
            const currentState = get();
            state.isAuthenticated = !!(user && currentState.token);
            console.log(
              "✅ Auth Store: User set, isAuthenticated:",
              state.isAuthenticated,
            );
          }),
        setToken: (token) =>
          set((state) => {
            console.log("🔄 Auth Store: Setting token");
            state.token = token;
            // Update isAuthenticated based on both token and user
            const currentState = get();
            state.isAuthenticated = !!(token && currentState.user);
            console.log(
              "✅ Auth Store: Token set, isAuthenticated:",
              state.isAuthenticated,
            );
          }),
        setRefreshToken: (refreshToken) =>
          set((state) => {
            console.log("🔄 Auth Store: Setting refresh token");
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
        setTenant: (tenant: Tenant | null) =>
          set((state) => {
            state.tenant = tenant;
            state.tenantId = tenant?.tenantId || null;
          }),
        login: (
          user,
          accessToken,
          refreshToken,
          expiresIn,
          rememberMe = false,
          tenant,
        ) =>
          set((state) => {
            console.log("🔄 Auth Store: Login called");
            state.user = user;
            state.token = accessToken;
            state.refreshToken = refreshToken;
            state.expiresIn = expiresIn;
            state.isAuthenticated = true; // Always true on login
            state.tenant = tenant || null;
            state.tenantId = tenant?.tenantId || user.tenantId || "default";
            state.sessionInfo = {
              loginTime: new Date().toISOString(),
              rememberMe,
              deviceInfo:
                typeof navigator !== "undefined" ? navigator.userAgent : null,
            };
            console.log(
              "✅ Auth Store: Login completed, isAuthenticated set to true",
            );
          }),
        logout: () =>
          set((state) => {
            console.log("🔄 Auth Store: Logout called");
            state.user = null;
            state.token = null;
            state.refreshToken = null;
            state.expiresIn = null;
            state.isAuthenticated = false;
            state.tenant = null;
            state.tenantId = null;
            state.sessionInfo = {
              loginTime: null,
              rememberMe: false,
              deviceInfo: null,
            };
            console.log(
              "✅ Auth Store: Logout completed, isAuthenticated set to false",
            );
          }),
        updateTokens: (accessToken, refreshToken) =>
          set((state) => {
            console.log("🔄 Auth Store: Updating tokens");
            state.token = accessToken;
            state.refreshToken = refreshToken;
            state.isAuthenticated = true;
            console.log(
              "✅ Auth Store: Tokens updated, isAuthenticated set to true",
            );
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
        // 🔥 IMPORTANT: Also persist isAuthenticated
        isAuthenticated: state.isAuthenticated,
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
