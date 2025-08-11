/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSocket } from "@/providers/socket-provider";
import { DirectMessage, Message } from "@/types/chat";
import { User } from "@/types/user";
import { useAuthStore } from "@/store/auth-store";
import type { Value } from "platejs";

// Enhanced Message interface with rich content support
export interface RichMessage extends Message {
  richContent?: Value;
  contentType?: "text" | "rich" | "image" | "file" | "code" | "system";
}

export function useMessages(channelId?: string, directMessageId?: string) {
  const endpoint = directMessageId
    ? `/direct-messages/${directMessageId}/messages`
    : channelId
    ? `/channels/${channelId}/messages`
    : null;

  return useQuery({
    queryKey: directMessageId
      ? ["messages", "direct", directMessageId]
      : ["messages", "channel", channelId],
    queryFn: async () => {
      if (!endpoint) return [];
      const { data } = await api.get(endpoint);
      return data as RichMessage[];
    },
    enabled: !!endpoint,
  });
}

export function useSendMessage() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: {
      content: string;
      richContent?: Value;
      contentType?: "text" | "rich" | "image" | "file" | "code" | "system";
      channelId?: string;
      directMessageId?: string;
      receiverId?: string;
      replyToId?: string;
      attachmentIds?: string[];
    }) => {
      console.log("Sending message:", {
        hasRichContent: !!message.richContent,
        contentType: message.contentType,
        contentLength: message.content.length,
      });

      // If socket is connected, emit message through socket
      if (socket?.connected) {
        return new Promise((resolve, reject) => {
          const messageData = {
            ...message,
            // Ensure content type is set appropriately
            contentType: message.richContent
              ? "rich"
              : message.contentType || "text",
          };

          if (message.directMessageId || message.receiverId) {
            socket.emit("send_direct_message", messageData, (response: any) => {
              if (response.success) {
                resolve(response);
              } else {
                reject(new Error(response.error || "Failed to send message"));
              }
            });
          } else if (message.channelId) {
            socket.emit(
              "send_channel_message",
              messageData,
              (response: any) => {
                if (response.success) {
                  resolve(response);
                } else {
                  reject(new Error(response.error || "Failed to send message"));
                }
              },
            );
          } else {
            reject(new Error("No target specified for message"));
          }
        });
      }
      // Fallback to REST API if socket not connected
      else {
        const endpoint =
          message.directMessageId || message.receiverId
            ? "/direct-messages/messages"
            : "/messages";

        const messageData = {
          ...message,
          contentType: message.richContent
            ? "rich"
            : message.contentType || "text",
        };

        const { data } = await api.post(endpoint, messageData);
        return data;
      }
    },
    onSuccess: (data: any, variables) => {
      console.log("Message sent successfully:", {
        messageId: data.message?.messageId,
        contentType: variables.contentType,
      });

      if (variables.directMessageId) {
        queryClient.invalidateQueries({
          queryKey: ["messages", "direct", variables.directMessageId],
        });
      } else if (variables.channelId) {
        queryClient.invalidateQueries({
          queryKey: ["messages", "channel", variables.channelId],
        });
      }

      // Also invalidate direct messages list if creating a new conversation
      if (variables.receiverId) {
        queryClient.invalidateQueries({ queryKey: ["direct-messages"] });
      }
    },
    onError: (error, variables) => {
      console.error("Failed to send message:", {
        error,
        contentType: variables.contentType,
        hasRichContent: !!variables.richContent,
      });
    },
  });
}

export function useDirectMessages() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ["direct-messages"],
    queryFn: async () => {
      const { data } = await api.get("/direct-messages");
      return data as DirectMessage[];
    },
    enabled: isAuthenticated,
  });
}

export function useDirectMessage(id?: string) {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ["direct-message", id],
    queryFn: async () => {
      const { data } = await api.get(`/direct-messages/${id}`);
      return data as DirectMessage;
    },
    enabled: isAuthenticated && !!id,
  });
}

export function useRecipient(userId?: string) {
  return useQuery({
    queryKey: ["user", userId],
    queryFn: async () => {
      const { data } = await api.get(`/users/${userId}`);
      return data as User;
    },
    enabled: !!userId,
  });
}

export function useUsers(searchQuery: string = "") {
  return useQuery({
    queryKey: ["users", searchQuery],
    queryFn: async () => {
      const params = searchQuery ? { search: searchQuery } : undefined;
      const { data } = await api.get("/users", { params });
      return data.users;
    },
  });
}

// New hook for rich content statistics
export function useRichContentStats(
  directMessageId?: string,
  channelId?: string,
) {
  const endpoint = directMessageId
    ? `/direct-messages/${directMessageId}/stats/rich-content`
    : channelId
    ? `/channels/${channelId}/stats/rich-content`
    : null;

  return useQuery({
    queryKey: directMessageId
      ? ["rich-content-stats", "direct", directMessageId]
      : ["rich-content-stats", "channel", channelId],
    queryFn: async () => {
      if (!endpoint) return null;
      const { data } = await api.get(endpoint);
      return data;
    },
    enabled: !!endpoint,
  });
}

// Hook for message editing (for future implementation)
export function useEditMessage() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      content,
      richContent,
      contentType,
      directMessageId,
      channelId,
    }: {
      messageId: string;
      content: string;
      richContent?: Value;
      contentType?: string;
      directMessageId?: string;
      channelId?: string;
    }) => {
      console.log("Editing message:", {
        messageId,
        hasRichContent: !!richContent,
        contentType,
        directMessageId,
        channelId,
      });

      // If socket is connected, use socket for real-time updates
      if (socket?.connected) {
        return new Promise((resolve, reject) => {
          const editData = {
            messageId,
            content,
            richContent,
            contentType: richContent ? "rich" : contentType || "text",
            directMessageId,
            channelId,
          };

          const eventName = directMessageId
            ? "edit_direct_message"
            : "edit_channel_message";

          socket.emit(eventName, editData, (response: any) => {
            if (response.success) {
              resolve(response);
            } else {
              reject(new Error(response.error || "Failed to edit message"));
            }
          });
        });
      }
      // Fallback to REST API if socket not connected
      else {
        const endpoint = directMessageId
          ? `/direct-messages/${directMessageId}/messages/${messageId}`
          : `/channels/${channelId}/messages/${messageId}`;

        const editData = {
          content,
          richContent,
          contentType: richContent ? "rich" : contentType || "text",
        };

        const { data } = await api.put(endpoint, editData);
        return data;
      }
    },
    onSuccess: (data: any, variables) => {
      // Invalidate relevant message queries
      if (variables.directMessageId) {
        queryClient.invalidateQueries({
          queryKey: ["messages", "direct", variables.directMessageId],
        });
      } else if (variables.channelId) {
        queryClient.invalidateQueries({
          queryKey: ["messages", "channel", variables.channelId],
        });
      }

      console.log("Message edited successfully:", {
        messageId: variables.messageId,
        hasRichContent: !!variables.richContent,
      });
    },
    onError: (error, variables) => {
      console.error("Failed to edit message:", {
        error,
        messageId: variables.messageId,
      });
    },
  });
}
