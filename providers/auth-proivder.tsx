"use client";

import { useAuthPersistence } from "@/hooks/use-auth-persistence";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useAuthPersistence();
  return <>{children}</>;
}
