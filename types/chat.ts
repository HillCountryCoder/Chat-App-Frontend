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
  sender?: {
    _id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
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
}
