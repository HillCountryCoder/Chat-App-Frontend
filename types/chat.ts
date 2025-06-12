// types/chat.ts
import { Attachment } from "./attachment";
import { User } from "./user";
export interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}
export interface Message {
  _id: string;
  messageId: string;
  senderId: string | User;
  channelId?: string;
  directMessageId?: string;
  content: string;
  contentType: string;
  createdAt: string;
  isEdited: boolean;
  reactions: Reaction[];
  replyToId?: string;
  replyTo?: {
    _id: string;
    content: string;
    senderId: {
      _id: string;
      displayName: string;
      username: string;
    };
  };
  sender?: {
    _id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  attachments: Attachment[];
  hasMedia: boolean;
  totalAttachmentSize?: number;
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
  creatorId: string;
  isArchived: boolean;
  lastActivity?: string;
  lastMessage?: Message;
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
  roles: string[];
  permissions: string[];
  joinedAt: string;
}

export interface UnreadCount {
  count: number;
  lastMessageAt?: string;
}

export interface UnreadCounts {
  directMessages: Record<string, number>;
  channels: Record<string, number>;
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
