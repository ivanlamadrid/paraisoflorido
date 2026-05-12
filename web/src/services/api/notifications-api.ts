import { api } from 'boot/axios';
import type {
  AppNotification,
  NotificationPlatform,
  NotificationTestResponse,
  NotificationTokenResponse,
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
