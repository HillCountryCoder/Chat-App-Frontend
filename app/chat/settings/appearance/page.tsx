"use client";
import React, { useState } from "react";
import { useTheme } from "next-themes";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Type,
  Zap,
  Eye,
  Contrast,
  Save,
} from "lucide-react";

interface AppearanceSettings {
  fontSize: number;
  fontFamily: string;
  compactMode: boolean;
  animationsEnabled: boolean;
  highContrast: boolean;
  colorScheme: string;
  sidebarPosition: string;
  messageSpacing: string;
}

const fontFamilies = [
  { value: "system", label: "System Default" },
  { value: "inter", label: "Inter" },
  { value: "roboto", label: "Roboto" },
  { value: "source-sans", label: "Source Sans Pro" },
  { value: "open-sans", label: "Open Sans" },
];

const colorSchemes = [
  { value: "default", label: "Default Blue", color: "bg-blue-500" },
  { value: "green", label: "Forest Green", color: "bg-green-500" },
  { value: "purple", label: "Royal Purple", color: "bg-purple-500" },
  { value: "orange", label: "Sunset Orange", color: "bg-orange-500" },
  { value: "pink", label: "Rose Pink", color: "bg-pink-500" },
  { value: "teal", label: "Ocean Teal", color: "bg-teal-500" },
];

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<AppearanceSettings>({
    fontSize: 14,
    fontFamily: "system",
    compactMode: false,
    animationsEnabled: true,
    highContrast: false,
    colorScheme: "default",
    sidebarPosition: "left",
    messageSpacing: "comfortable",
  });

  const [hasChanges, setHasChanges] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateSetting = (key: keyof AppearanceSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log("Saving appearance settings:", settings);
    setHasChanges(false);
  };

  const previewText =
    "This is how your messages will look with these settings.";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center space-x-2">
            <Palette className="h-8 w-8" />
            <span>Appearance Settings</span>
          </h1>
          <p className="text-muted-foreground">
            Customize the look and feel of your chat experience
          </p>
        </div>

        {hasChanges && (
          <Button onClick={handleSave} className="flex items-center space-x-2">
            <Save className="h-4 w-4" />
            <span>Save Changes</span>
          </Button>
        )}
      </div>

      {/* Theme Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sun className="h-5 w-5" />
            <span>Theme</span>
          </CardTitle>
          <CardDescription>Choose your preferred color theme</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div
              className={`cursor-pointer rounded-lg border-2 p-4 ${
                theme === "light" ? "border-primary" : "border-border"
              }`}
              onClick={() => setTheme("light")}
            >
              <div className="flex items-center space-x-2 mb-2">
                <Sun className="h-4 w-4" />
                <span className="font-medium">Light</span>
              </div>
              <div className="h-12 bg-background border rounded overflow-hidden">
                <div className="h-3 bg-card border-b"></div>
                <div className="p-2 space-y-1">
                  <div className="h-1 bg-foreground/20 rounded w-3/4"></div>
                  <div className="h-1 bg-foreground/10 rounded w-1/2"></div>
                </div>
              </div>
            </div>

            <div
              className={`cursor-pointer rounded-lg border-2 p-4 ${
                theme === "dark" ? "border-primary" : "border-border"
              }`}
              onClick={() => setTheme("dark")}
            >
              <div className="flex items-center space-x-2 mb-2">
                <Moon className="h-4 w-4" />
                <span className="font-medium">Dark</span>
              </div>
              <div className="h-12 bg-gray-900 border rounded overflow-hidden">
                <div className="h-3 bg-gray-800 border-b border-gray-700"></div>
                <div className="p-2 space-y-1">
                  <div className="h-1 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-1 bg-gray-400 rounded w-1/2"></div>
                </div>
              </div>
            </div>

            <div
              className={`cursor-pointer rounded-lg border-2 p-4 ${
                theme === "system" ? "border-primary" : "border-border"
              }`}
              onClick={() => setTheme("system")}
            >
              <div className="flex items-center space-x-2 mb-2">
                <Monitor className="h-4 w-4" />
                <span className="font-medium">System</span>
              </div>
              <div className="h-12 border rounded overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-background to-gray-900"></div>
                <div className="relative h-3 bg-card/50 border-b"></div>
                <div className="relative p-2 space-y-1">
                  <div className="h-1 bg-foreground/30 rounded w-3/4"></div>
                  <div className="h-1 bg-foreground/20 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color Scheme */}
      <Card>
        <CardHeader>
          <CardTitle>Color Scheme</CardTitle>
          <CardDescription>Choose your preferred accent color</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {colorSchemes.map((scheme) => (
              <div
                key={scheme.value}
                className={`cursor-pointer rounded-lg border-2 p-3 ${
                  settings.colorScheme === scheme.value
                    ? "border-primary"
                    : "border-border"
                }`}
                onClick={() => updateSetting("colorScheme", scheme.value)}
              >
                <div className="flex items-center space-x-2">
                  <div className={`w-4 h-4 rounded-full ${scheme.color}`}></div>
                  <span className="text-sm font-medium">{scheme.label}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Typography */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Type className="h-5 w-5" />
            <span>Typography</span>
          </CardTitle>
          <CardDescription>Customize fonts and text sizing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Font Size */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Font Size</Label>
                <Badge variant="outline">{settings.fontSize}px</Badge>
              </div>
              <Slider
                value={[settings.fontSize]}
                onValueChange={([value]) => updateSetting("fontSize", value)}
                min={12}
                max={20}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Small</span>
                <span>Large</span>
              </div>
            </div>

            <Separator />

            {/* Font Family */}
            <div className="space-y-3">
              <Label>Font Family</Label>
              <Select
                value={settings.fontFamily}
                onValueChange={(value) => updateSetting("fontFamily", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontFamilies.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div
                className="p-4 border rounded-lg bg-card"
                style={{
                  fontSize: `${settings.fontSize}px`,
                  fontFamily:
                    settings.fontFamily === "system"
                      ? "system-ui, -apple-system, sans-serif"
                      : settings.fontFamily,
                }}
              >
                <div className="space-y-2">
                  <div className="font-semibold">John Doe</div>
                  <div>{previewText}</div>
                  <div className="text-sm text-muted-foreground">
                    2 minutes ago
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layout & Spacing */}
      <Card>
        <CardHeader>
          <CardTitle>Layout & Spacing</CardTitle>
          <CardDescription>
            Adjust the layout and spacing of elements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="compact-mode" className="flex flex-col space-y-1">
                <span>Compact Mode</span>
                <span className="text-xs text-muted-foreground">
                  Reduce spacing between messages
                </span>
              </Label>
              <Switch
                id="compact-mode"
                checked={settings.compactMode}
                onCheckedChange={(checked) =>
                  updateSetting("compactMode", checked)
                }
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Message Spacing</Label>
              <Select
                value={settings.messageSpacing}
                onValueChange={(value) =>
                  updateSetting("messageSpacing", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="comfortable">Comfortable</SelectItem>
                  <SelectItem value="spacious">Spacious</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Sidebar Position</Label>
              <Select
                value={settings.sidebarPosition}
                onValueChange={(value) =>
                  updateSetting("sidebarPosition", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accessibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Accessibility</span>
          </CardTitle>
          <CardDescription>
            Settings to improve accessibility and usability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="high-contrast"
                className="flex flex-col space-y-1"
              >
                <span className="flex items-center space-x-2">
                  <Contrast className="h-4 w-4" />
                  <span>High Contrast</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  Increase contrast for better visibility
                </span>
              </Label>
              <Switch
                id="high-contrast"
                checked={settings.highContrast}
                onCheckedChange={(checked) =>
                  updateSetting("highContrast", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Label htmlFor="animations" className="flex flex-col space-y-1">
                <span className="flex items-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <span>Animations</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  Enable smooth animations and transitions
                </span>
              </Label>
              <Switch
                id="animations"
                checked={settings.animationsEnabled}
                onCheckedChange={(checked) =>
                  updateSetting("animationsEnabled", checked)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reset Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Reset Settings</CardTitle>
          <CardDescription>
            Restore appearance settings to their defaults
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => {
              setSettings({
                fontSize: 14,
                fontFamily: "system",
                compactMode: false,
                animationsEnabled: true,
                highContrast: false,
                colorScheme: "default",
                sidebarPosition: "left",
                messageSpacing: "comfortable",
              });
              setTheme("system");
              setHasChanges(true);
            }}
          >
            Reset to Defaults
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
