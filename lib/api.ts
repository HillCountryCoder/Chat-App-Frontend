/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { createErrorFromResponse } from "@/lib/errors/factory";
import { BaseError } from "@/lib/errors";
import { useAuthStore } from "@/store/auth-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
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
