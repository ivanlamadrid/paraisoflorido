import type { StudentShift } from 'src/types/attendance';
import type { UserRole } from 'src/types/session';

export type AnnouncementStatus =
  | 'draft'
  | 'scheduled'
  | 'published'
  | 'archived';

export type AnnouncementPriority = 'normal' | 'important' | 'urgent';

export type AnnouncementType =
  | 'institutional'
  | 'administrative'
  | 'academic'
  | 'attendance';

export type AnnouncementReadState = 'all' | 'unread' | 'read';

export type AnnouncementAudienceType =
  | 'all'
  | 'all_students'
  | 'all_staff'
  | 'role'
  | 'student_grade'
  | 'student_classroom'
  | 'student_shift'
  | 'student';

export interface AnnouncementLinkInput {
  label: string;
  url: string;
  sortOrder?: number;
}

export interface AnnouncementAudienceInput {
  audienceType: AnnouncementAudienceType;
  role?: UserRole;
  schoolYear?: number;
  grade?: number;
  section?: string;
  shift?: StudentShift;
  studentId?: string;
}

export interface CreateAnnouncementPayload {
  title: string;
  summary: string;
  body: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  isPinned?: boolean;
  scheduledAt?: string;
  visibleFrom?: string;
  visibleUntil?: string;
  links?: AnnouncementLinkInput[];
  audiences: AnnouncementAudienceInput[];
}

export type UpdateAnnouncementPayload = Partial<CreateAnnouncementPayload>;

export interface QueryAnnouncementFeed {
  page?: number;
  limit?: number;
  type?: AnnouncementType;
  priority?: AnnouncementPriority;
  unreadOnly?: boolean;
  readState?: AnnouncementReadState;
}

export interface QueryAdminAnnouncements {
  page?: number;
  limit?: number;
  search?: string;
  status?: AnnouncementStatus;
  priority?: AnnouncementPriority;
  type?: AnnouncementType;
  isPinned?: boolean;
}

export interface AnnouncementLink {
  id: string;
  label: string;
  url: string;
  sortOrder: number;
}

export interface AnnouncementAudience {
  id: string;
  audienceType: AnnouncementAudienceType;
  role: UserRole | null;
  schoolYear: number | null;
  grade: number | null;
  section: string | null;
  shift: StudentShift | null;
  studentId: string | null;
  studentCode: string | null;
  studentFullName: string | null;
  label: string;
}

export interface AnnouncementFeedItem {
  id: string;
  title: string;
  summary: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  isPinned: boolean;
  publishedAt: string;
  visibleFrom: string | null;
  visibleUntil: string | null;
  linksCount: number;
  isRead: boolean;
  firstReadAt: string | null;
  lastReadAt: string | null;
}

export interface AnnouncementDetail extends AnnouncementFeedItem {
  body: string;
  links: AnnouncementLink[];
}

export interface AnnouncementFeedResponse {
  items: AnnouncementFeedItem[];
  total: number;
  page: number;
  limit: number;
  summary: {
    unreadCount: number;
    pinnedCount: number;
    urgentCount: number;
  };
}

export interface AnnouncementUnreadCountResponse {
  unreadCount: number;
}

export interface AnnouncementReadResponse {
  announcementId: string;
  firstReadAt: string;
  lastReadAt: string;
}

export interface AnnouncementAdminListItem {
  id: string;
  title: string;
  summary: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  isPinned: boolean;
  scheduledAt: string | null;
  publishedAt: string | null;
  visibleFrom: string | null;
  visibleUntil: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  createdByDisplayName: string;
  publishedByUserId: string | null;
  publishedByDisplayName: string | null;
  archivedByUserId: string | null;
  archivedByDisplayName: string | null;
  archivedAt: string | null;
  readCount: number;
  audienceSummary: string[];
}

export interface AnnouncementAdminListResponse {
  items: AnnouncementAdminListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AnnouncementAdminDetail extends AnnouncementAdminListItem {
  body: string;
  links: AnnouncementLink[];
  audiences: AnnouncementAudience[];
  canEdit: boolean;
  canPublish: boolean;
  canArchive: boolean;
  canDelete: boolean;
}
