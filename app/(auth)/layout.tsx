// app/(auth)/layout.tsx
import React from "react";
import { Card } from "@/components/ui/card";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md w-full">
        <Card className="p-8 shadow-sm">
          {children}
        </Card>
      </div>
    </div>
  );
}
