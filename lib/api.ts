/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { createErrorFromResponse } from "@/lib/errors/factory";
import { BaseError } from "@/lib/errors";
import { useAuthStore } from "@/store/auth-store";
import { isTokenExpired } from "@/hooks/use-auth-persistence";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Queue for failed requests during token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });

  failedQueue = [];
};

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && !isTokenExpired(token)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Add request to queue
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = Cookies.get("refreshToken");
        if (!refreshToken) {
          throw new Error("No refresh token");
        }

        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Update cookies and store
        const cookieOptions = {
          path: "/",
          sameSite: "strict" as const,
          secure: process.env.NODE_ENV === "production",
        };

        Cookies.set("token", accessToken, { ...cookieOptions, expires: 1 });
        Cookies.set("refreshToken", newRefreshToken, {
          ...cookieOptions,
          expires: 30,
        });

        useAuthStore
          .getState()
          .actions.updateTokens(accessToken, newRefreshToken);

        processQueue(null);

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        useAuthStore.getState().actions.logout();
        Cookies.remove("token");
        Cookies.remove("refreshToken");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const appError = createErrorFromResponse(error);
    return Promise.reject(appError);
  },
);

export async function apiRequest<T = any>(
  config: AxiosRequestConfig,
): Promise<T> {
  try {
    const response = await api(config);
    return response.data;
  } catch (error) {
    if (error instanceof BaseError) {
      throw error;
    }
    throw createErrorFromResponse(error);
  }
}

export const apiClient = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) =>
    apiRequest<T>({ ...config, method: "GET", url }),
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiRequest<T>({ ...config, method: "POST", url, data }),
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiRequest<T>({ ...config, method: "PUT", url, data }),
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiRequest<T>({ ...config, method: "PATCH", url, data }),
  delete: <T = any>(url: string, config?: AxiosRequestConfig) =>
    apiRequest<T>({ ...config, method: "DELETE", url }),
};
