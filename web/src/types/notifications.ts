export type NotificationPlatform = 'web' | 'android' | 'ios' | 'unknown';

export type AppNotificationType =
  | 'attendance_marked'
  | 'attendance_entry_marked'
  | 'announcement_published'
  | 'system_test';

export interface NotificationTokenResponse {
  id: string;
  platform: NotificationPlatform;
  enabled: boolean;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  studentId: string | null;
  type: AppNotificationType;
  title: string;
  body: string;
  data: Record<string, string> | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationDeliverySummary {
  totalTokens: number;
  sent: number;
  failed: number;
  invalidTokens: number;
  skipped: number;
}

export interface NotificationTestResponse {
  notification: AppNotification;
  delivery: NotificationDeliverySummary;
}

export interface NotificationDebugToken {
  id: string;
  platform: NotificationPlatform;
  tokenPreview: string;
  lastSeenAt: string | null;
}

export interface NotificationDebugSendResponse {
  userId: string;
  role: string;
  activeTokensCount: number;
  tokens: NotificationDebugToken[];
  message: string;
  notification: AppNotification;
  delivery: NotificationDeliverySummary;
}
