/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSocket } from "@/providers/socket-provider";
import {
  Channel,
  Message,
  ChannelMember,
  ChannelType,
  Thread,
} from "@/types/chat";

export function useChannels() {
  return useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const { data } = await api.get("/channels");
      return data as Channel[];
    },
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
      if (!channelId) return [];
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
      if (!channelId) return [];
      const { data } = await api.get(`/channels/${channelId}/members`);

      // Fetch user details for each member if not included
      const membersWithUsers = await Promise.all(
        data.map(async (member: ChannelMember) => {
          if (member.user) return member;

          try {
            const { data: userData } = await api.get(`/users/${member.userId}`);
            return { ...member, user: userData };
          } catch (error) {
            console.error(
              `Failed to fetch user details for ${member.userId}`,
              error,
            );
            return member;
          }
        }),
      );

      return membersWithUsers as ChannelMember[];
    },
    enabled: !!channelId,
  });
}

export function useSendChannelMessage() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: { content: string; channelId: string }) => {
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
      }
      // Fallback to REST API if socket not connected
      else {
        const { data } = await api.post(
          `/channels/${message.channelId}/messages`,
          {
            content: message.content,
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
    mutationFn: async (channelData: {
      name: string;
      description?: string;
      type?: ChannelType;
      memberIds: string[];
    }) => {
      const { data } = await api.post("/channels", channelData);
      return data;
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
      const { data } = await api.post(`/channels/${channelId}/members`, {
        userId,
      });
      return data;
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
      await api.delete(`/channels/${channelId}/members/${userId}`);
      return { channelId, userId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["channel-members", variables.channelId],
      });
    },
  });
}

// Thread related hooks
export function useChannelThreads(channelId?: string) {
  return useQuery({
    queryKey: ["threads", "channel", channelId],
    queryFn: async () => {
      if (!channelId) return [];
      const { data } = await api.get(`/channels/${channelId}/threads`);
      return data as Thread[];
    },
    enabled: !!channelId,
  });
}

export function useThread(channelId?: string, threadId?: string) {
  return useQuery({
    queryKey: ["thread", channelId, threadId],
    queryFn: async () => {
      if (!channelId || !threadId) return null;
      const { data } = await api.get(
        `/channels/${channelId}/threads/${threadId}`,
      );
      return data as Thread;
    },
    enabled: !!channelId && !!threadId,
  });
}

export function useThreadMessages(channelId?: string, threadId?: string) {
  return useQuery({
    queryKey: ["messages", "thread", channelId, threadId],
    queryFn: async () => {
      if (!channelId || !threadId) return [];
      const { data } = await api.get(
        `/channels/${channelId}/threads/${threadId}/messages`,
      );
      return data as Message[];
    },
    enabled: !!channelId && !!threadId,
  });
}

export function useCreateThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      channelId: string;
      messageId: string;
      content: string;
      title?: string;
    }) => {
      const { data: responseData } = await api.post(
        `/channels/${data.channelId}/threads`,
        {
          messageId: data.messageId,
          content: data.content,
          title: data.title,
        },
      );
      return responseData;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["threads", "channel", variables.channelId],
      });
      queryClient.invalidateQueries({
        queryKey: ["messages", "channel", variables.channelId],
      });
    },
  });
}

export function useSendThreadMessage() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: {
      content: string;
      channelId: string;
      threadId: string;
    }) => {
      // If socket is connected, emit message through socket
      if (socket?.connected) {
        return new Promise((resolve, reject) => {
          socket.emit("send_thread_message", message, (response: any) => {
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
        const { data } = await api.post(
          `/channels/${message.channelId}/threads/${message.threadId}/messages`,
          { content: message.content },
        );
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "messages",
          "thread",
          variables.channelId,
          variables.threadId,
        ],
      });
      // Also update the thread itself as lastActivity will change
      queryClient.invalidateQueries({
        queryKey: ["thread", variables.channelId, variables.threadId],
      });
    },
  });
}
