/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSocket } from "@/providers/socket-provider";
import { Channel, ChannelMember, Message } from "@/types/chat";
import { useAuthStore } from "@/store/auth-store";
import { Value } from "platejs";

export function useChannels() {
  const { isAuthenticated, token } = useAuthStore();
  return useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const { data } = await api.get("/channels");
      return data as Channel[];
    },
    enabled: isAuthenticated && !!token,
  });
}

export function useChannel(id?: string) {
  return useQuery({
    queryKey: ["channel", id],
    queryFn: async () => {
      const { data } = await api.get(`/channels/${id}`);
      return data as Channel;
    },
    enabled: !!id,
  });
}

export function useChannelMessages(channelId?: string) {
  return useQuery({
    queryKey: ["messages", "channel", channelId],
    queryFn: async () => {
      const { data } = await api.get(`/channels/${channelId}/messages`);
      return data as Message[];
    },
    enabled: !!channelId,
  });
}

export function useChannelMembers(channelId?: string) {
  return useQuery({
    queryKey: ["channel-members", channelId],
    queryFn: async () => {
      const { data } = await api.get(`/channels/${channelId}/members`);
      return data as ChannelMember[];
    },
    enabled: !!channelId,
  });
}

export function useSendChannelMessage() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: {
      content: string;
      richContent?: Value;
      contentType?: "text" | "rich" | "image" | "file" | "code" | "system";
      channelId: string;
      replyToId?: string;
      attachmentIds?: string[];
    }) => {
      console.log("Sending channel message:", {
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

          socket.emit("send_channel_message", messageData, (response: any) => {
            if (response.success) {
              resolve(response);
            } else {
              reject(new Error(response.error || "Failed to send message"));
            }
          });
        });
      } else {
        // Fallback to REST API
        const messageData = {
          content: message.content,
          richContent: message.richContent,
          contentType: message.richContent
            ? "rich"
            : message.contentType || "text",
          replyToId: message.replyToId,
          attachmentIds: message.attachmentIds,
        };

        const { data } = await api.post(
          `/channels/${message.channelId}/messages`,
          messageData,
        );
        return data;
      }
    },
    onSuccess: (data: any, variables) => {
      console.log("Channel message sent successfully:", {
        messageId: data.message?.messageId,
        contentType: variables.contentType,
      });

      queryClient.invalidateQueries({
        queryKey: ["messages", "channel", variables.channelId],
      });
    },
    onError: (error, variables) => {
      console.error("Failed to send channel message:", {
        error,
        contentType: variables.contentType,
        hasRichContent: !!variables.richContent,
      });
    },
  });
}

export function useCreateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      type?: string;
      memberIds: string[];
    }) => {
      const response = await api.post("/channels", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });
}

export function useAddChannelMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channelId,
      userId,
    }: {
      channelId: string;
      userId: string;
    }) => {
      const response = await api.post(`/channels/${channelId}/members`, {
        userId,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["channel-members", variables.channelId],
      });
    },
  });
}

export function useRemoveChannelMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channelId,
      userId,
    }: {
      channelId: string;
      userId: string;
    }) => {
      const response = await api.delete(
        `/channels/${channelId}/members/${userId}`,
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["channel-members", variables.channelId],
      });
    },
  });
}

export function useEditChannelMessage() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      content,
      richContent,
      contentType,
      channelId,
    }: {
      messageId: string;
      content: string;
      richContent?: Value;
      contentType?: string;
      channelId: string;
    }) => {
      console.log("Editing channel message:", {
        messageId,
        hasRichContent: !!richContent,
        contentType,
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
            channelId,
          };

          socket.emit("edit_channel_message", editData, (response: any) => {
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
        const endpoint = `/channels/${channelId}/messages/${messageId}`;

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
      // Invalidate channel message queries
      queryClient.invalidateQueries({
        queryKey: ["messages", "channel", variables.channelId],
      });

      console.log("Channel message edited successfully:", {
        messageId: variables.messageId,
        hasRichContent: !!variables.richContent,
      });
    },
    onError: (error, variables) => {
      console.error("Failed to edit channel message:", {
        error,
        messageId: variables.messageId,
      });
    },
  });
}
