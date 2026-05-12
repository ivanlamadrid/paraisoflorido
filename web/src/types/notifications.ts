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

export interface WebPushSubscriptionResponse {
  id: string;
  enabled: boolean;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebPushDebugSubscription {
  id: string;
  endpointPreview: string;
  lastSeenAt: string | null;
}

export interface WebPushDeliveryResult {
  subscriptionId: string | null;
  endpointPreview: string | null;
  status: 'sent' | 'failed' | 'invalid_token' | 'skipped';
  statusCode: number | null;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface WebPushDeliverySummary {
  enabled: boolean;
  configured: boolean;
  totalSubscriptions: number;
  sent: number;
  failed: number;
  skipped: number;
  disabledSubscriptions: number;
  results: WebPushDeliveryResult[];
}

export interface WebPushDebugResponse {
  userId: string;
  role: string;
  webPushEnabled: boolean;
  webPushConfigured: boolean;
  vapidSubjectConfigured: boolean;
  vapidPublicKeyConfigured: boolean;
  vapidPrivateKeyConfigured: boolean;
  activeSubscriptionsCount: number;
  subscriptions: WebPushDebugSubscription[];
}

export interface WebPushDebugSendResponse {
  userId: string;
  role: string;
  activeSubscriptionsCount: number;
  message: string;
  delivery: WebPushDeliverySummary;
}
