export interface Tenant {
  tenantId: string;
  name: string;
  domain: string;
  allowedOrigins: string[];
  status: "pending_verification" | "verified" | "suspended";
  settings?: {
    customBranding?: {
      logo?: string;
      primaryColor?: string;
      accentColor?: string;
    };
  };
}

export interface SSOInitResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
  };
  tenant: {
    id: string;
    name: string;
  };
}
