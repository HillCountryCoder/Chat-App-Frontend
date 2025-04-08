import { User } from "./user";

// types/chat.ts
export interface Message {
  _id: string;
  messageId: string;
  senderId: string;
  channelId?: string;
  directMessageId?: string;
  content: string;
  contentType: string;
  createdAt: string;
  isEdited: boolean;
  sender?: User;
}

export enum ChannelType {
  TEXT = "text",
  VOICE = "voice",
  ANNOUNCEMENT = "announcement",
}

export interface Channel {
  _id: string;
  spaceId: string;
  name: string;
  description?: string;
  type: ChannelType;
  isArchived: boolean;
  createdAt: string;
}

export interface ChannelMember {
  _id: string;
  channelId: string;
  userId: string;
  permissions: string[];
  joinedAt: string;
  notificationPreference: string;
  user?: User;
}

export interface DirectMessage {
  _id: string;
  participantIds: string[];
  lastActivity: string;
  lastMessage: Message | null;
}

export interface Space {
  _id: string;
  name: string;
  description?: string;
  creatorId: string;
  avatarUrl?: string;
  createdAt: string;
  visibility: string;
  type: string;
}
