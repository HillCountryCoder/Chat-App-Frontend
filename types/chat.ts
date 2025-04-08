// types/chat.ts
export interface Message {
  _id: string;
  messageId: string;
  senderId: string;
  channelId?: string;
  directMessageId?: string;
  threadId?: string;
  isThreadStarter?: boolean;
  content: string;
  contentType: string;
  createdAt: string;
  isEdited: boolean;
  sender?: {
    _id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export enum ChannelType {
  TEXT = "text",
  VOICE = "voice",
  ANNOUNCEMENT = "announcement",
}

export enum MemberRole {
  ADMIN = "admin",
  MODERATOR = "moderator",
  MEMBER = "member",
}

export interface Channel {
  _id: string;
  name: string;
  description?: string;
  creatorId: string;
  avatarUrl?: string;
  type: ChannelType;
  isArchived: boolean;
  createdAt: string;
}

export interface ChannelMember {
  _id: string;
  channelId: string;
  userId: string;
  roles: MemberRole[];
  permissions: string[];
  joinedAt: string;
  notificationPreference: string;
  user?: {
    _id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    status: string;
  };
}

export interface DirectMessage {
  _id: string;
  participantIds: string[];
  lastActivity: string;
  lastMessage?: Message;
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
