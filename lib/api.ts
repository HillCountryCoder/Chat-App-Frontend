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

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  // Check token validity before sending the request
  if (token) {
    if (isTokenExpired(token)) {
      console.warn("Token expired, logging out user");
      // Clean up on next event loop to prevent state updates during render
      setTimeout(() => {
        useAuthStore.getState().actions.logout();
        Cookies.remove("token");
        // Use window.location instead of redirect() for cleaner redirect outside of React components
        window.location.href = "/login";
      }, 0);

      // Throw an error to abort the current request
      throw new axios.Cancel("Operation canceled due to expired token");
    }

    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const appError = createErrorFromResponse(error);
    return Promise.reject(appError);
  },
);

/**
 * Generic API request function with better error handling
 */
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

/**
 * HTTP method wrappers with typed responses
 */
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
