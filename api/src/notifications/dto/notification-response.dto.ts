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
