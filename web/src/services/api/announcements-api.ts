import { api } from 'boot/axios';
import type {
  AnnouncementAdminDetail,
  AnnouncementAdminListResponse,
  AnnouncementDetail,
  AnnouncementFeedResponse,
  AnnouncementReadResponse,
  AnnouncementUnreadCountResponse,
  CreateAnnouncementPayload,
  QueryAdminAnnouncements,
  QueryAnnouncementFeed,
  UpdateAnnouncementPayload,
} from 'src/types/announcements';

export async function getAnnouncementFeed(
  query: QueryAnnouncementFeed,
): Promise<AnnouncementFeedResponse> {
  const { data } = await api.get<AnnouncementFeedResponse>('/announcements/feed', {
    params: query,
  });

  return data;
}

export async function getAnnouncementUnreadCount(): Promise<AnnouncementUnreadCountResponse> {
  const { data } = await api.get<AnnouncementUnreadCountResponse>(
    '/announcements/feed/unread-count',
  );

  return data;
}

export async function getAnnouncementDetail(
  announcementId: string,
): Promise<AnnouncementDetail> {
  const { data } = await api.get<AnnouncementDetail>(
    `/announcements/${announcementId}`,
  );

  return data;
}

export async function markAnnouncementAsRead(
  announcementId: string,
): Promise<AnnouncementReadResponse> {
  const { data } = await api.post<AnnouncementReadResponse>(
    `/announcements/${announcementId}/read`,
  );

  return data;
}

export async function getAdminAnnouncements(
  query: QueryAdminAnnouncements,
): Promise<AnnouncementAdminListResponse> {
  const { data } = await api.get<AnnouncementAdminListResponse>(
    '/announcements/admin',
    {
      params: query,
    },
  );

  return data;
}

export async function getAdminAnnouncementDetail(
  announcementId: string,
): Promise<AnnouncementAdminDetail> {
  const { data } = await api.get<AnnouncementAdminDetail>(
    `/announcements/admin/${announcementId}`,
  );

  return data;
}

export async function createAnnouncement(
  payload: CreateAnnouncementPayload,
): Promise<AnnouncementAdminDetail> {
  const { data } = await api.post<AnnouncementAdminDetail>(
    '/announcements',
    payload,
  );

  return data;
}

export async function updateAnnouncement(
  announcementId: string,
  payload: UpdateAnnouncementPayload,
): Promise<AnnouncementAdminDetail> {
  const { data } = await api.patch<AnnouncementAdminDetail>(
    `/announcements/${announcementId}`,
    payload,
  );

  return data;
}

export async function publishAnnouncement(
  announcementId: string,
): Promise<AnnouncementAdminDetail> {
  const { data } = await api.post<AnnouncementAdminDetail>(
    `/announcements/${announcementId}/publish`,
  );

  return data;
}

export async function archiveAnnouncement(
  announcementId: string,
): Promise<AnnouncementAdminDetail> {
  const { data } = await api.post<AnnouncementAdminDetail>(
    `/announcements/${announcementId}/archive`,
  );

  return data;
}

export async function deleteAnnouncement(
  announcementId: string,
): Promise<{ id: string; message: string }> {
  const { data } = await api.delete<{ id: string; message: string }>(
    `/announcements/${announcementId}`,
  );

  return data;
}
