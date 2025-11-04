import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { apiClient } from "@/lib/api";
import Cookies from "js-cookie";
import { SSOInitResponse } from "@/types/tenant";
import { getExpiryDays } from "@/utils/date-utils";
import { UserStatus } from "@/types/user";

export function useSSOAuth() {
  const { actions } = useAuthStore();

  return useMutation({
    mutationFn: async (data: { token: string; signature: string }) => {
      console.log("🔄 Calling SSO init API with data:", data);
      const response = await apiClient.post<SSOInitResponse>(
        "/tenants/sso/init",
        data,
      );
      return response;
    },
    onSuccess: (data) => {
      const {
        user,
        accessToken,
        refreshToken,
        accessTokenExpiresIn,
        refreshTokenExpiresIn,
        tenant,
      } = data;
      const isInIframe =
        typeof window !== "undefined" && window !== window.parent;
      const cookieOptions = {
        path: "/",
        sameSite: isInIframe ? ("none" as const) : ("lax" as const),
        secure: isInIframe ? true : process.env.NODE_ENV === "production",
        ...(isInIframe && { partitioned: true }),
      };

      const accessTokenExpiry = getExpiryDays(accessTokenExpiresIn || "15m");
      const refreshTokenExpiry = getExpiryDays(refreshTokenExpiresIn || "30d");

      Cookies.set("token", accessToken, {
        ...cookieOptions,
        expires: accessTokenExpiry,
      });

      console.log("✅ SSO init successful, processing response:", tenant, user);
      Cookies.set("refreshToken", refreshToken, {
        ...cookieOptions,
        expires: refreshTokenExpiry,
      });

      // Convert API user to User type
      const fullUser = {
        _id: user.id,
        email: user.email,
        displayName: user.displayName,
        username: user.email.split("@")[0],
        avatarUrl: user.avatarUrl,
        status: UserStatus.ONLINE,
        tenantId: tenant.id,
      };

      const tenantData = {
        tenantId: tenant.id,
        name: tenant.name,
        domain: "",
        allowedOrigins: [],
        status: "verified" as const,
      };
      console.log(
        "👤 Full user data prepared for login SSO:",
        fullUser,
        tenantData,
      );
      actions.login(
        fullUser,
        accessToken,
        refreshToken,
        accessTokenExpiresIn,
        false,
        tenantData,
      );
    },
  });
}
