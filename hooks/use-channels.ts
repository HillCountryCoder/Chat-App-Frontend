import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSocket } from "@/providers/socket-provider";
import { Channel, ChannelMember, Message } from "@/types/chat";
import { useAuthStore } from "@/store/auth-store";

export function useChannels() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const { data } = await api.get("/channels");
      return data as Channel[];
    },
    enabled: isAuthenticated,
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
      channelId: string;
      replyToId?: string;
      attachmentIds?: string[];
    }) => {
      // If socket is connected, emit message through socket
      if (socket?.connected) {
        return new Promise((resolve, reject) => {
          socket.emit("send_channel_message", message, (response: any) => {
            if (response.success) {
              resolve(response);
            } else {
              reject(new Error(response.error || "Failed to send message"));
            }
          });
        });
      } else {
        // Fallback to REST API
        const { data } = await api.post(
          `/channels/${message.channelId}/messages`,
          {
            content: message.content,
	    replyToId: message.replyToId,
	    attachmentIds: message.attachmentIds,
          },
        );
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
