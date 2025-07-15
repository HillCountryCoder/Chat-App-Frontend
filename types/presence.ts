export enum PRESENCE_STATUS {
  ONLINE = "online",
  OFFLINE = "offline", 
  AWAY = "away",
  BUSY = "busy",
}

export interface DeviceInfo {
  type: "web" | "mobile" | "desktop";
  userAgent?: string;
  socketId?: string;
}

export interface PresenceStatus {
  userId: string;
  status: PRESENCE_STATUS;
  lastSeen: Date;
  deviceInfo?: DeviceInfo;
}

export interface PresenceUpdate {
  userId: string;
  connectionStatus: "online" | "offline";
  userStatus?: PRESENCE_STATUS;
  timestamp: Date;
}

export interface OnlineUsersResponse {
  users: PresenceStatus[];
  nextCursor: string;
}

export interface PresenceStats {
  totalOnline: number;
  statusBreakdown: Record<string, number>;
  deviceBreakdown: Record<string, number>;
}

export interface PresenceHistory {
  _id: string;
  userId: string;
  status: PRESENCE_STATUS;
  sessionStart: Date;
  sessionEnd?: Date;
  duration?: number;
  deviceInfo: DeviceInfo;
  createdAt: Date;
  updatedAt: Date;
}

export interface PresenceAnalytics {
  totalSessions: number;
  totalOnlineTime: number;
  averageSessionDuration: number;
  dailyBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface PresenceSocketEvents {
	authenticate_presence: (
		data: any,
		callback: (response: {
			success: boolean;
			userId ?: string;
			heartbeatInterval ?: number;
			error?: string;
		}) => void
	) => void;

	heartbeat: (
		data: {status ?: PRESENCE_STATUS},
		callback: (response: {
			success: boolean;
			timestamp ?: string;
			status ?: PRESENCE_STATUS;
			error ?: string;
		}) => void
	) => void;
	
	change_status: (
		data: {status ?: PRESENCE_STATUS},
		callback: (response: {
			success: boolean;
			status?: PRESENCE_STATUS;
			timestamp?: string;
			error?: string;
		}) => void
	) => void;

	get_presence: (
	    data: { userIds: string[] },
	    callback: (response: {
	      success: boolean;
	      presence?: Record<string, PresenceStatus>;
	      error?: string;
	    }) => void
	  ) => void;

	  get_online_users: (
	    data: { limit?: number; cursor?: string },
	    callback: (response: {
	      success: boolean;
	      users?: PresenceStatus[];
	      nextCursor?: string;
	      error?: string;
	    }) => void
	  ) => void;

	  ping: (
	    callback: (response: {
	      success: boolean;
	      timestamp?: string;
	    }) => void
	  ) => void;
}

export interface PresenceSocketListeners {
	presence_update: (data: PresenceUpdate) => void;
	user_online: (data: {userId: string; status: PRESENCE_STATUS; timestamp: Date}) => void;
	user_offline: (data: {userId: string; timestamp: Date}) => void;
	status_changed: (data: {
		userId: string;
		oldStatus: PRESENCE_STATUS;
		newStatus: PRESENCE_STATUS;
		timestamp: Date;
	}) => void;
}
