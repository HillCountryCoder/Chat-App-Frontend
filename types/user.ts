export interface User {
  _id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status: UserStatus;
  lastSeen?: string;
  tenantId: string;
  externalId?: string;
  externalSystem?: string;
}

export enum UserStatus {
  ONLINE = "online",
  OFFLINE = "offline",
  AWAY = "away",
  DO_NOT_DISTURB = "do_not_disturb",
}
