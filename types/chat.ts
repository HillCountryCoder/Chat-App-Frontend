import { User } from "./user";

// types/chat.ts
export interface Message {
  _id: string;
  messageId: string;
  senderId: string;
  channelId?: string;
  directMessageId?: string;
  threadId?: string;
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
  name: string;
  description?: string;
  type: ChannelType;
  isArchived: boolean;
  creatorId: string;
  lastActivity: string;
}

export interface DirectMessage {
  _id: string;
  participantIds: string[];
  lastActivity: string;
  lastMessage?: Message;
}

export interface ChannelMember {
  _id: string;
  channelId: string;
  userId: string;
  user?: User;
  permissions: string[];
  roles: string[];
  joinedAt: string;
}

export interface Thread {
  _id: string;
  channelId: string;
  parentMessageId: string;
  title?: string;
  createdAt: string;
  lastActivity: string;
  participantIds: string[];
}
