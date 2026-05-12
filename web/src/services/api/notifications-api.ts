import { api } from 'boot/axios';
import type {
  AppNotification,
  NotificationDebugSendResponse,
  NotificationPlatform,
  NotificationTestResponse,
  NotificationTokenResponse,
  WebPushDebugResponse,
  WebPushDebugSendResponse,
  WebPushSubscriptionResponse,
} from 'src/types/notifications';

export async function registerNotificationToken(payload: {
  token: string;
  platform: NotificationPlatform;
  userAgent?: string;
}): Promise<NotificationTokenResponse> {
  const { data } = await api.post<NotificationTokenResponse>('/notifications/tokens', payload);

  return data;
}

export async function unregisterNotificationToken(token: string): Promise<{ ok: true }> {
  const { data } = await api.delete<{ ok: true }>('/notifications/tokens/current', {
    data: { token },
  });

  return data;
}

export async function getNotifications(): Promise<AppNotification[]> {
  const { data } = await api.get<AppNotification[]>('/notifications');

  return data;
}

export async function markNotificationAsRead(
  notificationId: string,
): Promise<{ id: string; readAt: string }> {
  const { data } = await api.patch<{ id: string; readAt: string }>(
    `/notifications/${notificationId}/read`,
  );

  return data;
}

export async function sendTestNotification(): Promise<NotificationTestResponse> {
  const { data } = await api.post<NotificationTestResponse>('/notifications/test');

  return data;
}

export async function sendDebugNotificationToMe(): Promise<NotificationDebugSendResponse> {
  const { data } = await api.post<NotificationDebugSendResponse>('/notifications/debug/send-to-me');

  return data;
}

export async function registerWebPushSubscription(payload: {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}): Promise<WebPushSubscriptionResponse> {
  const { data } = await api.post<WebPushSubscriptionResponse>(
    '/notifications/web-push/subscriptions',
    payload,
  );

  return data;
}

export async function unregisterWebPushSubscription(endpoint: string): Promise<{ ok: true }> {
  const { data } = await api.delete<{ ok: true }>(
    '/notifications/web-push/subscriptions/current',
    {
      data: { endpoint },
    },
  );

  return data;
}

export async function getWebPushDebugInfo(): Promise<WebPushDebugResponse> {
  const { data } = await api.get<WebPushDebugResponse>('/notifications/web-push/debug/me');

  return data;
}

export async function sendWebPushDebugToMe(): Promise<WebPushDebugSendResponse> {
  const { data } = await api.post<WebPushDebugSendResponse>(
    '/notifications/web-push/debug/send-to-me',
  );

  return data;
}
