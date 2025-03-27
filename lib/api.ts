// lib/api.ts
import axios from "axios";
import { useAuthStore } from "@/store/auth-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Create a type for your backend error structure
export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: {
    requestContext?: {
      method: string;
      path: string;
      ip: string;
      userAgent: string;
    };
    [key: string]: unknown;
  };
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If we have a response from the server, extract our API error structure
    if (error.response) {
      const errorData = error.response.data;

      // For authentication errors, handle logout
      if (error.response.status === 401) {
        useAuthStore.getState().actions.logout();
        // Consider using a more robust approach than redirect, which
        // might not work in all contexts
        // You might want to return the error and handle redirection in components
      }

      const apiError: ApiError = errorData;
      return Promise.reject(apiError);
    }

    // For network errors or other issues
    return Promise.reject({
      status: 500,
      code: "NETWORK_ERROR",
      message: error.message || "An unexpected error occurred",
    });
  },
);
