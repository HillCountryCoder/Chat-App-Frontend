import { User } from "./user";

// types/chat.ts
export interface Message {
  _id: string;
  messageId: string;
  senderId: string | User; // Can be either a string ID or populated User object from MongoDB
  channelId?: string;
  directMessageId?: string;
  content: string;
  contentType: string;
  createdAt: string;
  isEdited: boolean;
  sender?: User; // For backward compatibility
}

export interface Channel {
  _id: string;
  spaceId: string;
  name: string;
  description?: string;
  type: string;
  isArchived: boolean;
}

export interface DirectMessage {
  _id: string;
  participantIds: string[];
  lastActivity: string;
  lastMessage: Message | null;
}
