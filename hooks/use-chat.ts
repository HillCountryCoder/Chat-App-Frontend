/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSocket } from "@/providers/socket-provider";
import { DirectMessage, Message } from "@/types/chat";
import { User } from "@/types/user";

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
      return data as Message[];
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
      channelId?: string;
      directMessageId?: string;
      receiverId?: string;
    }) => {
      // If socket is connected, emit message through socket
      if (socket?.connected) {
        return new Promise((resolve, reject) => {
          if (message.directMessageId || message.receiverId) {
            socket.emit("send_direct_message", message, (response: any) => {
              if (response.success) {
                resolve(response);
              } else {
                reject(new Error(response.error || "Failed to send message"));
              }
            });
          } else if (message.channelId) {
            socket.emit("send_channel_message", message, (response: any) => {
              if (response.success) {
                resolve(response);
              } else {
                reject(new Error(response.error || "Failed to send message"));
              }
            });
          }
        });
      }
      // Fallback to REST API if socket not connected
      else {
        const endpoint =
          message.directMessageId || message.receiverId
            ? "/direct-messages/messages"
            : "/messages";
        const { data } = await api.post(endpoint, message);
        return data;
      }
    },
    onSuccess: (data: any, variables) => {
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
  });
}

export function useDirectMessages() {
  return useQuery({
    queryKey: ["direct-messages"],
    queryFn: async () => {
      const { data } = await api.get("/direct-messages");
      return data as DirectMessage[];
    },
  });
}

export function useDirectMessage(id?: string) {
  return useQuery({
    queryKey: ["direct-message", id],
    queryFn: async () => {
      const { data } = await api.get(`/direct-messages/${id}`);
      return data as DirectMessage;
    },
    enabled: !!id,
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
      const { data } = await api.get("/users", {
        params: searchQuery ? { search: searchQuery } : undefined,
      });
      return data as User[];
    },
  });
}
