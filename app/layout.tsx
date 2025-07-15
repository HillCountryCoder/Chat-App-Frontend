import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import QueryProvider from "@/providers/query-provider";
import { SocketProvider } from "@/providers/socket-provider";
import { PresenceProvider } from "@/providers/presence-provider";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import "./globals.css";
import { ErrorProvider } from "@/providers/error-providers";
import { ThemeProvider } from "@/providers/theme-provider";
import { ReactionProvider } from "@/contexts/ReactionContext";
import { AuthProvider } from "@/providers/auth-proivder";
import SessionExpiredAlert from "@/components/SessionExpiredAlert";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chat Application",
  description: "Real-time chat application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              <ErrorProvider>
                <SocketProvider>
                  <PresenceProvider>
                    <ReactionProvider>
                      <AuthProvider>
                        {children}
                        <Toaster richColors position="top-right" />
                        <SessionExpiredAlert />
                      </AuthProvider>
                    </ReactionProvider>
                  </PresenceProvider>
                </SocketProvider>
              </ErrorProvider>
            </QueryProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
