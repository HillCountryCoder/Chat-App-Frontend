// hooks/use-messenger-integration.ts
import { useEffect } from "react";
import { useUnreadCounts } from "@/hooks/use-unread";
import { useChatMessenger } from "@/providers/chat-messenger-provider";

export function useMessengerIntegration() {
  const { messenger, isReady } = useChatMessenger();
  const { getTotalUnreadCount } = useUnreadCounts();

  // Update parent apps when unread count changes
  useEffect(() => {
    if (messenger && isReady) {
      const totalUnread = getTotalUnreadCount();
      messenger.updateMessageCount(totalUnread);
    }
  }, [getTotalUnreadCount(), messenger, isReady]);

  // Listen for theme updates from parent
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleThemeUpdate = (event: CustomEvent) => {
      const { theme } = event.detail;
      // Apply theme to your chat app
      document.documentElement.classList.toggle("dark", theme === "dark");
    };

    window.addEventListener(
      "chat:themeUpdate",
      handleThemeUpdate as EventListener,
    );
    return () =>
      window.removeEventListener(
        "chat:themeUpdate",
        handleThemeUpdate as EventListener,
      );
  }, []);

  return {
    messenger,
    isReady,
    notifyNewMessage: messenger?.notifyNewMessage.bind(messenger),
    notifyMessagesRead: messenger?.notifyMessagesRead.bind(messenger),
    updateMessageCount: messenger?.updateMessageCount.bind(messenger),
  };
}
