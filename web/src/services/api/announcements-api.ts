import { api } from 'boot/axios';
import { apiCacheTags, apiCacheTtls } from 'src/services/api/cache-policies';
import {
  invalidateDataCache,
  readWithDataCache,
} from 'src/services/api/data-cache';
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

function invalidateAnnouncementsCache(): void {
  invalidateDataCache({
    tags: [
      apiCacheTags.announcementFeed,
      apiCacheTags.announcementDetail,
      apiCacheTags.adminAnnouncements,
    ],
  });
}

export async function getAnnouncementFeed(
  query: QueryAnnouncementFeed,
): Promise<AnnouncementFeedResponse> {
  const { data } = await api.get<AnnouncementFeedResponse>('/announcements/feed', {
    params: query,
  });

  return data;
}

export async function getAnnouncementFeedCached(
  query: QueryAnnouncementFeed,
  options: { forceRefresh?: boolean } = {},
): Promise<AnnouncementFeedResponse> {
  return readWithDataCache({
    fetcher: () => getAnnouncementFeed(query),
    forceRefresh: options.forceRefresh,
    keyParts: ['announcements', 'feed', query],
    tags: [apiCacheTags.announcementFeed],
    ttlMs: apiCacheTtls.announcementFeed,
  });
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

export async function getAnnouncementDetailCached(
  announcementId: string,
  options: { forceRefresh?: boolean } = {},
): Promise<AnnouncementDetail> {
  return readWithDataCache({
    fetcher: () => getAnnouncementDetail(announcementId),
    forceRefresh: options.forceRefresh,
    keyParts: ['announcements', 'detail', announcementId],
    tags: [apiCacheTags.announcementDetail],
    ttlMs: apiCacheTtls.announcementDetail,
  });
}

export async function markAnnouncementAsRead(
  announcementId: string,
): Promise<AnnouncementReadResponse> {
  const { data } = await api.post<AnnouncementReadResponse>(
    `/announcements/${announcementId}/read`,
  );

  invalidateAnnouncementsCache();

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

export async function getAdminAnnouncementsCached(
  query: QueryAdminAnnouncements,
  options: { forceRefresh?: boolean } = {},
): Promise<AnnouncementAdminListResponse> {
  return readWithDataCache({
    fetcher: () => getAdminAnnouncements(query),
    forceRefresh: options.forceRefresh,
    keyParts: ['announcements', 'admin', query],
    tags: [apiCacheTags.adminAnnouncements],
    ttlMs: apiCacheTtls.adminAnnouncements,
  });
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

  invalidateAnnouncementsCache();

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

  invalidateAnnouncementsCache();

  return data;
}

export async function publishAnnouncement(
  announcementId: string,
): Promise<AnnouncementAdminDetail> {
  const { data } = await api.post<AnnouncementAdminDetail>(
    `/announcements/${announcementId}/publish`,
  );

  invalidateAnnouncementsCache();

  return data;
}

export async function archiveAnnouncement(
  announcementId: string,
): Promise<AnnouncementAdminDetail> {
  const { data } = await api.post<AnnouncementAdminDetail>(
    `/announcements/${announcementId}/archive`,
  );

  invalidateAnnouncementsCache();

  return data;
}

export async function deleteAnnouncement(
  announcementId: string,
): Promise<{ id: string; message: string }> {
  const { data } = await api.delete<{ id: string; message: string }>(
    `/announcements/${announcementId}`,
  );

  invalidateAnnouncementsCache();

  return data;
}
