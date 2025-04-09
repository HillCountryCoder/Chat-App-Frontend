"use client";

import { useEffect } from "react";
import { useUnreadCounts } from "@/hooks/use-unread";

/**
 * A component that updates the document title when there are unread messages
 * No visual output - just updates the browser tab title
 */
export default function DocumentTitleUpdater() {
  const { getTotalUnreadCount } = useUnreadCounts();
  const appName = "Chat App";

  useEffect(() => {
    const updateTitle = () => {
      const unreadCount = getTotalUnreadCount();

      if (unreadCount > 0) {
        document.title = `(${unreadCount}) ${appName}`;
      } else {
        document.title = appName;
      }
    };

    // Update initially
    updateTitle();

    // Set up an interval to check for changes
    const intervalId = setInterval(updateTitle, 2000);

    // Clean up
    return () => {
      clearInterval(intervalId);
      document.title = appName;
    };
  }, [getTotalUnreadCount]);

  // This component doesn't render anything
  return null;
}
