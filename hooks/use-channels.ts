import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSocket } from "@/providers/socket-provider";
import { Channel, ChannelType, Message } from "@/types/chat";

// Get all channels for the current user
export function useChannels() {
  return useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const { data } = await api.get("/channels");
      return data as Channel[];
    },
  });
}

// Get a specific channel by ID
export function useChannel(channelId?: string) {
  return useQuery({
    queryKey: ["channel", channelId],
    queryFn: async () => {
      const { data } = await api.get(`/channels/${channelId}`);
      return data as Channel;
    },
    enabled: !!channelId,
  });
}

// Get channel members
export function useChannelMembers(channelId?: string) {
  return useQuery({
    queryKey: ["channel-members", channelId],
    queryFn: async () => {
      const { data } = await api.get(`/channels/${channelId}/members`);
      return data;
    },
    enabled: !!channelId,
  });
}

// Get channel messages
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

// Send a message to a channel
export function useSendChannelMessage() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: {
      content: string;
      channelId: string;
    }) => {
      // If socket is connected, emit message through socket
      if (socket?.connected) {
        return new Promise((resolve, reject) => {
          socket.emit("send_channel_message", message, (response: { success: boolean; error?: string }) => {
            if (response.success) {
              resolve(response);
            } else {
              reject(new Error(response.error || "Failed to send message"));
            }
          });
        });
      }
      // Fallback to REST API if socket not connected
      else {
        const { data } = await api.post(`/channels/${message.channelId}/messages`, {
          content: message.content
        });
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", "channel", variables.channelId],
      });
    },
  });
}

// Create a new channel
export function useCreateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      type: ChannelType;
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

// Add a member to a channel
export function useAddChannelMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, userId }: { channelId: string; userId: string }) => {
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

// Remove a member from a channel
export function useRemoveChannelMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, userId }: { channelId: string; userId: string }) => {
      const response = await api.delete(`/channels/${channelId}/members/${userId}`);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["channel-members", variables.channelId],
      });
    },
  });
}