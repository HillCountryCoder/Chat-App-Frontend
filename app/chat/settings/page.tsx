// app/chat/settings/page.tsx
"use client";

import React from "react";
import { useAuthStore } from "@/store/auth-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Settings,
  Shield,
  Bell,
  User,
  Palette,
  ChevronRight,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

const quickActions = [
  {
    title: "Update Profile",
    description: "Change your name, avatar, and bio",
    href: "/chat/settings/profile",
    icon: User,
    action: "Edit Profile",
  },
  {
    title: "Security Settings",
    description: "Manage passwords and active sessions",
    href: "/chat/settings/security",
    icon: Shield,
    action: "Manage Security",
  },
  {
    title: "Notification Preferences",
    description: "Control how you receive notifications",
    href: "/chat/settings/notifications",
    icon: Bell,
    action: "Configure Notifications",
  },
  {
    title: "Theme & Appearance",
    description: "Customize the look and feel",
    href: "/chat/settings/appearance",
    icon: Palette,
    action: "Change Theme",
  },
];

const securityStatus = [
  {
    item: "Strong Password",
    status: "good",
    description: "Your password meets security requirements",
  },
  {
    item: "Two-Factor Authentication",
    status: "warning",
    description: "Not enabled - recommended for better security",
  },
  {
    item: "Active Sessions",
    status: "good",
    description: "2 active sessions from trusted devices",
  },
];

export default function SettingsOverviewPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Account Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.avatarUrl} alt={user?.username} />
              <AvatarFallback className="text-lg">
                {user?.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-xl font-semibold">{user?.username}</h3>
              <p className="text-muted-foreground">{user?.email}</p>
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="secondary">Active</Badge>
                <Badge variant="outline">
                  Member since {new Date().getFullYear()}
                </Badge>
              </div>
            </div>
            <Link href="/chat/settings/profile">
              <Button variant="outline">Edit Profile</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common settings and configurations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{action.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {action.action}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Security Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Security Status</span>
          </CardTitle>
          <CardDescription>Overview of your account security</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {securityStatus.map((item, index) => (
              <div key={index} className="flex items-center space-x-3">
                {item.status === "good" ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{item.item}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                {item.status === "warning" && (
                  <Link href="/chat/settings/security">
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t">
            <Link href="/chat/settings/security">
              <Button variant="outline" className="w-full">
                View All Security Settings
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
