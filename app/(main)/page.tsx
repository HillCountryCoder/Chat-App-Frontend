// app/(main)/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useLogout } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const logout = useLogout();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  const handleLogout = async () => {
    await logout.mutateAsync();
    router.push("/login");
  };

  if (!isAuthenticated || !user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Chat Application</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              Logged in as{" "}
              <span className="font-medium">{user.displayName}</span>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">
            Welcome, {user.displayName}!
          </h2>
          <p className="text-muted-foreground mb-4">
            You have successfully logged into the chat application. Start
            connecting with others!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="bg-background p-4 rounded-md border">
              <h3 className="font-medium mb-2">Your Profile</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Username:</span>
                  <span>{user.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span>{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="flex items-center">
                    <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                    {user.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-background p-4 rounded-md border">
              <h3 className="font-medium mb-2">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" className="w-full">
                  Create Channel
                </Button>
                <Button variant="secondary" className="w-full">
                  Direct Message
                </Button>
                <Button variant="secondary" className="w-full">
                  Edit Profile
                </Button>
                <Button variant="secondary" className="w-full">
                  Invite Users
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
