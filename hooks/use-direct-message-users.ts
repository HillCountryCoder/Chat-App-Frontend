import { useAuthStore } from "@/store/auth-store";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { User } from "@/types/user";
import { DirectMessage } from "@/types/chat";

/**
 * Hook to fetch and organize user data for direct messages
 * @param directMessages Array of direct messages
 * @returns Object containing user data and loading state
 */
export function useDirectMessageUsers(
  directMessages: DirectMessage[] | undefined,
) {
  const { user: currentUser } = useAuthStore();

  const otherParticipantIds = directMessages
    ? directMessages.flatMap((dm) =>
        dm.participantIds.filter((id) => id !== currentUser?._id),
      )
    : [];

  const { data: users, isLoading } = useQuery({
    queryKey: ["users", "participants", otherParticipantIds],
    queryFn: async () => {
      if (otherParticipantIds.length === 0) return {};

      // Get each user by ID
      const userPromises = otherParticipantIds.map(async (userId) => {
        try {
          const { data } = await api.get(`/users/${userId}`);
          return data;
        } catch (error) {
          console.error(`Failed to fetch user ${userId}:`, error);
          return null;
        }
      });

      const users = await Promise.all(userPromises);

      // Create a map of user ID to user data
      const userMap: Record<string, User> = {};
      users.filter(Boolean).forEach((user) => {
        if (user && user._id) {
          userMap[user._id] = user;
        }
      });

      return userMap;
    },
    enabled: otherParticipantIds.length > 0,
  });
  /**
   * Function to get the other participant's data from a direct message
   */
  const getOtherParticipant = (dm: DirectMessage): User | undefined => {
    if (!currentUser) return undefined;

    const otherParticipantId = dm.participantIds.find(
      (id) => id !== currentUser._id,
    );
    if (!otherParticipantId) return undefined;

    return users?.[otherParticipantId];
  };

  return {
    userMap: users || {},
    isLoading,
    getOtherParticipant,
  };
}
