// utils/ChatAppMessenger.ts

interface ParentAppInfo {
  id: string;
  name: string;
  origin: string;
}

interface MessagePayload {
  [key: string]: any;
}

interface ChatAppConfig {
  enableLogging?: boolean;
  allowedParentOrigins?: string[];
}

interface NewMessageData {
  messageId?: string;
  sender: string;
  content: string;
  timestamp?: number;
  channelId?: string;
  directMessageId?: string;
  conversationType?: "dm" | "channel";
}

export class ChatAppMessenger {
  private config: ChatAppConfig;
  private connectedParents = new Map<string, ParentAppInfo>();
  private isReady = false;
  private static instance: ChatAppMessenger | null = null;

  // Add unread count cache
  private unreadCounts = new Map<string, number>();

  constructor(config: ChatAppConfig = {}) {
    this.config = {
      enableLogging: process.env.NODE_ENV === "development",
      allowedParentOrigins: ["*"], // Configure this for production
      ...config,
    };

    // Only setup if we're in the browser
    if (typeof window !== "undefined") {
      this.setupMessageListener();
      this.notifyReady();
    }
  }

  // Singleton pattern to ensure one messenger instance
  public static getInstance(config?: ChatAppConfig): ChatAppMessenger {
    if (!ChatAppMessenger.instance) {
      ChatAppMessenger.instance = new ChatAppMessenger(config);
    }
    return ChatAppMessenger.instance;
  }

  // Notify all connected parent apps that chat is ready
  private notifyReady() {
    if (typeof window === "undefined") return;

    this.sendToAllParents("CHAT_READY", {
      timestamp: Date.now(),
      version: "1.0",
      capabilities: ["messaging", "notifications", "user-management"],
    });
    this.isReady = true;

    if (this.config.enableLogging) {
      console.log("[Chat App] Notified parent apps - ready");
    }
  }

  // Send message to specific parent app
  public sendToParent(
    parentId: string,
    type: string,
    payload?: MessagePayload,
  ) {
    const parent = this.connectedParents.get(parentId);
    if (!parent) {
      console.warn(`[Chat App] Parent app ${parentId} not found`);
      return;
    }

    this.sendMessage(parent.origin, type, payload);
  }

  // Send message to all connected parent apps
  public sendToAllParents(type: string, payload?: MessagePayload) {
    if (this.connectedParents.size === 0) {
      // Fallback: send to window.parent
      this.sendMessage("*", type, payload);
    } else {
      this.connectedParents.forEach((parent) => {
        this.sendMessage(parent.origin, type, payload);
      });
    }
  }

  // Private method to actually send the message
  private sendMessage(
    targetOrigin: string,
    type: string,
    payload?: MessagePayload,
  ) {
    // Check if we're in browser environment
    if (typeof window === "undefined") return;

    try {
      const message = {
        source: "chat-app",
        type,
        payload,
        timestamp: Date.now(),
      };

      window.parent.postMessage(message, targetOrigin);

      if (this.config.enableLogging) {
        console.log("[Chat App] Sent to parent:", message);
      }
    } catch (error) {
      console.error("[Chat App] Failed to send message to parent:", error);
    }
  }

  // Listen for messages from parent applications
  private setupMessageListener() {
    // Check if we're in browser environment
    if (typeof window === "undefined") return;

    window.addEventListener("message", (event: MessageEvent) => {
      if (!this.isValidParentOrigin(event.origin)) {
        if (this.config.enableLogging) {
          console.warn(
            "[Chat App] Ignored message from unauthorized origin:",
            event.origin,
          );
        }
        return;
      }

      // Handle messages from any parent app (identified by source)
      if (event.data?.source && event.data.source !== "chat-app") {
        this.handleParentMessage(event.data, event.origin);
      }
    });
  }

  private handleParentMessage(data: any, origin: string) {
    if (this.config.enableLogging) {
      console.log("[Chat App] Received from parent:", data);
    }

    switch (data.type) {
      case "PARENT_APP_INFO":
        // Register the parent app
        this.connectedParents.set(data.source, {
          id: data.source,
          name: data.payload?.name || data.source,
          origin,
        });

        if (this.config.enableLogging) {
          console.log(
            `[Chat App] Registered parent app: ${
              data.payload?.name || data.source
            }`,
          );
        }
        break;

      case "MARK_AS_READ":
        this.handleMarkAsRead(data.source);
        break;

      case "USER_INFO_UPDATE":
        this.handleUserInfoUpdate(data.payload?.user, data.source);
        break;

      case "THEME_UPDATE":
        this.handleThemeUpdate(data.payload?.theme, data.source);
        break;

      default:
        if (this.config.enableLogging) {
          console.log(
            "[Chat App] Unknown message type from parent:",
            data.type,
          );
        }
    }
  }

  // PUBLIC API METHODS - Call these from your chat components

  // Call this when a new message is received in chat
  public notifyNewMessage(
    messageData: NewMessageData,
    targetParentId?: string,
  ) {
    if (!this.isReady) return;

    const conversationId = messageData.channelId || messageData.directMessageId;
    const unreadCount = this.getUnreadMessageCount(
      messageData.conversationType,
      conversationId,
    );

    const payload = {
      messageId: messageData.messageId || Date.now().toString(),
      sender: messageData.sender,
      preview:
        messageData.content.substring(0, 50) +
        (messageData.content.length > 50 ? "..." : ""),
      timestamp: messageData.timestamp || Date.now(),
      unreadCount,
      conversationType: messageData.conversationType,
      conversationId,
    };

    if (targetParentId) {
      this.sendToParent(targetParentId, "NEW_MESSAGE", payload);
    } else {
      this.sendToAllParents("NEW_MESSAGE", payload);
    }
  }

  // Call this when message count changes
  public updateMessageCount(count: number, targetParentId?: string) {
    if (!this.isReady) return;

    const payload = { count };

    if (targetParentId) {
      this.sendToParent(targetParentId, "MESSAGE_COUNT_UPDATE", payload);
    } else {
      this.sendToAllParents("MESSAGE_COUNT_UPDATE", payload);
    }
  }

  // Call this when messages are marked as read in chat
  public notifyMessagesRead(targetParentId?: string) {
    if (!this.isReady) return;

    const payload = { timestamp: Date.now() };

    if (targetParentId) {
      this.sendToParent(targetParentId, "MESSAGES_READ", payload);
    } else {
      this.sendToAllParents("MESSAGES_READ", payload);
    }
  }

  // PUBLIC METHODS for managing unread counts

  // Update unread count for a specific conversation
  public updateUnreadCount(conversationId: string, count: number) {
    this.unreadCounts.set(conversationId, count);
  }

  // Clear unread count for a specific conversation
  public clearUnreadCount(conversationId: string) {
    this.unreadCounts.delete(conversationId);
  }

  // Get total unread count across all conversations
  public getTotalUnreadCount(): number {
    let total = 0;
    this.unreadCounts.forEach((count) => (total += count));
    return total;
  }

  // PRIVATE HANDLER METHODS - Customize these based on your chat app

  private handleMarkAsRead(parentId: string) {
    // Implement your mark as read logic here
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("chat:markAsRead", {
          detail: { parentId },
        }),
      );
    }

    this.notifyMessagesRead(parentId);

    if (this.config.enableLogging) {
      console.log(`[Chat App] Messages marked as read for parent: ${parentId}`);
    }
  }

  private handleUserInfoUpdate(userInfo: any, parentId: string) {
    // Update your chat UI with user information
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("chat:userInfoUpdate", {
          detail: { userInfo, parentId },
        }),
      );
    }

    if (this.config.enableLogging) {
      console.log(
        `[Chat App] User info updated from parent ${parentId}:`,
        userInfo,
      );
    }
  }

  private handleThemeUpdate(theme: string, parentId: string) {
    // Apply theme changes to your chat app
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("chat:themeUpdate", {
          detail: { theme, parentId },
        }),
      );
    }

    if (this.config.enableLogging) {
      console.log(`[Chat App] Theme updated from parent ${parentId}:`, theme);
    }
  }

  // UTILITY METHODS - Now properly implemented

  private getUnreadMessageCount(
    type?: "dm" | "channel",
    conversationId?: string,
  ): number {
    if (!conversationId) {
      // Return total unread count if no specific conversation
      return this.getTotalUnreadCount();
    }

    // Return specific conversation unread count
    return this.unreadCounts.get(conversationId) || 0;
  }

  private isValidParentOrigin(origin: string): boolean {
    if (this.config.allowedParentOrigins?.includes("*")) {
      return true; // Allow all origins (development only)
    }

    return (
      this.config.allowedParentOrigins?.some((allowed) =>
        origin.includes(allowed.replace("https://", "").replace("http://", "")),
      ) || false
    );
  }

  // Get list of connected parent apps
  public getConnectedParents(): ParentAppInfo[] {
    return Array.from(this.connectedParents.values());
  }

  // Disconnect and cleanup
  public disconnect() {
    this.sendToAllParents("CHAT_DISCONNECTED");
    this.connectedParents.clear();
    this.isReady = false;
    this.unreadCounts.clear();
  }
}
