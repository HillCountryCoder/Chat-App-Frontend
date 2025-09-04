// providers/chat-messenger-provider.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { ChatAppMessenger } from "@/utils/ChatAppMessenger"; // Note: fix typo in filename if needed

interface ChatMessengerContextType {
  messenger: ChatAppMessenger | null;
  isReady: boolean;
}

const ChatMessengerContext = createContext<ChatMessengerContextType | null>(
  null,
);

interface ChatMessengerProviderProps {
  children: ReactNode;
}

export function ChatMessengerProvider({
  children,
}: ChatMessengerProviderProps) {
  const [messenger, setMessenger] = useState<ChatAppMessenger | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Only initialize on client side
    if (typeof window !== "undefined") {
      const messengerInstance = ChatAppMessenger.getInstance({
        enableLogging: process.env.NODE_ENV === "development",
        allowedParentOrigins:
          process.env.NODE_ENV === "production"
            ? ["https://www.whatnextplease.com", "https://staging.whatnextplease.com", "http://localhost:3000"]
            : ["*"], // Allow all in development
      });

      setMessenger(messengerInstance);
      setIsReady(true);

      // Cleanup on unmount
      return () => {
        messengerInstance.disconnect();
      };
    }
  }, []);

  return (
    <ChatMessengerContext.Provider value={{ messenger, isReady }}>
      {children}
    </ChatMessengerContext.Provider>
  );
}

export function useChatMessenger() {
  const context = useContext(ChatMessengerContext);
  if (!context) {
    throw new Error(
      "useChatMessenger must be used within a ChatMessengerProvider",
    );
  }
  return context;
}
