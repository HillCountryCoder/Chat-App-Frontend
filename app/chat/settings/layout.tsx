// app/chat/settings/layout.tsx
"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Shield,
  User,
  Bell,
  Palette,
  Key,
  Monitor,
  Settings,
  ChevronLeft,
} from "lucide-react";

const settingsNavItems = [
  {
    title: "General",
    href: "/chat/settings",
    icon: Settings,
    description: "General settings and preferences",
  },
  {
    title: "Profile",
    href: "/chat/settings/profile",
    icon: User,
    description: "Manage your profile information",
  },
  {
    title: "Security",
    href: "/chat/settings/security",
    icon: Shield,
    description: "Security settings and sessions",
  },
  {
    title: "Notifications",
    href: "/chat/settings/notifications",
    icon: Bell,
    description: "Notification preferences",
  },
  {
    title: "Appearance",
    href: "/chat/settings/appearance",
    icon: Palette,
    description: "Theme and display settings",
  },
  {
    title: "Privacy",
    href: "/chat/settings/privacy",
    icon: Key,
    description: "Privacy and data settings",
  },
  {
    title: "Devices",
    href: "/chat/settings/devices",
    icon: Monitor,
    description: "Manage connected devices",
  },
];

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="p-6">
            <div className="flex items-center space-x-2">
              <Link href="/chat">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h2 className="text-lg font-semibold">Settings</h2>
                <p className="text-sm text-muted-foreground">
                  Manage your account
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {settingsNavItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-start space-x-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-tight">
                        {item.description}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t">
            <div className="text-xs text-muted-foreground">
              <p>Chat Application</p>
              <p>Version 1.0.0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="container max-w-4xl mx-auto py-6 px-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
