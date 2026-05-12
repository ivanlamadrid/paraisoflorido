import { NotificationType } from '../enums/notification-type.enum';
import { NotificationDeliveryStatus } from '../enums/notification-delivery-status.enum';
import { NotificationPlatform } from '../enums/notification-platform.enum';

export class NotificationTokenResponseDto {
  id: string;
  platform: NotificationPlatform;
  enabled: boolean;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export class NotificationResponseDto {
  id: string;
  userId: string;
  studentId: string | null;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, string> | null;
  readAt: string | null;
  createdAt: string;
}

export class NotificationDeliverySummaryDto {
  totalTokens: number;
  sent: number;
  failed: number;
  invalidTokens: number;
  skipped: number;
}

export class NotificationTestResponseDto {
  notification: NotificationResponseDto;
  delivery: NotificationDeliverySummaryDto;
}

export class NotificationDebugTokenDto {
  id: string;
  platform: NotificationPlatform;
  tokenPreview: string;
  lastSeenAt: string | null;
}

export class NotificationDebugSendResponseDto {
  userId: string;
  role: string;
  activeTokensCount: number;
  tokens: NotificationDebugTokenDto[];
  message: string;
  notification: NotificationResponseDto;
  delivery: NotificationDeliverySummaryDto;
}

export class WebPushSubscriptionResponseDto {
  id: string;
  enabled: boolean;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export class WebPushDebugSubscriptionDto {
  id: string;
  endpointPreview: string;
  lastSeenAt: string | null;
}

export class WebPushDeliveryResultDto {
  subscriptionId: string | null;
  endpointPreview: string | null;
  status: 'sent' | 'failed' | 'invalid_token' | 'skipped';
  statusCode: number | null;
  errorCode: string | null;
  errorMessage: string | null;
}

export class WebPushDeliverySummaryDto {
  enabled: boolean;
  configured: boolean;
  totalSubscriptions: number;
  sent: number;
  failed: number;
  skipped: number;
  disabledSubscriptions: number;
  results: WebPushDeliveryResultDto[];
}

export class WebPushDebugResponseDto {
  userId: string;
  role: string;
  webPushEnabled: boolean;
  webPushConfigured: boolean;
  vapidSubjectConfigured: boolean;
  vapidPublicKeyConfigured: boolean;
  vapidPrivateKeyConfigured: boolean;
  activeSubscriptionsCount: number;
  subscriptions: WebPushDebugSubscriptionDto[];
}

export class WebPushDebugSendResponseDto {
  userId: string;
  role: string;
  activeSubscriptionsCount: number;
  message: string;
  delivery: WebPushDeliverySummaryDto;
}

export class MarkNotificationReadResponseDto {
  id: string;
  readAt: string;
}

export type NotificationDeliveryAttemptResultDto = {
  status: NotificationDeliveryStatus;
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};
