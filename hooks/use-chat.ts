// hooks/use-chat.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSocket } from "@/providers/socket-provider";
import { Message } from "@/types/chat";

export function useMessages(channelId?: string, directMessageId?: string) {
  const queryKey = channelId
    ? ["messages", "channel", channelId]
    : ["messages", "direct", directMessageId];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const endpoint = channelId
        ? `/messages/channel/${channelId}`
        : `/messages/direct/${directMessageId}`;
      const { data } = await api.get(endpoint);
      return data as Message[];
    },
    enabled: !!(channelId || directMessageId),
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
    }) => {
      // If socket is connected, emit message through socket
      if (socket?.connected) {
        return new Promise((resolve) => {
          socket.emit("send_message", message, (response: unknown) => {
            resolve(response);
          });
        });
      }
      // Fallback to REST API if socket not connected
      else {
        const { data } = await api.post("/messages", message);
        return data;
      }
    },
    onSuccess: (data, variables) => {
      const queryKey = variables.channelId
        ? ["messages", "channel", variables.channelId]
        : ["messages", "direct", variables.directMessageId];

      queryClient.invalidateQueries({ queryKey });
    },
  });
}
