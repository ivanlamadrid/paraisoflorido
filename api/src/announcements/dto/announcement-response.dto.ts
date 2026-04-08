import { UserRole } from '../../common/enums/user-role.enum';
import { StudentShift } from '../../common/enums/student-shift.enum';
import { AnnouncementAudienceType } from '../enums/announcement-audience-type.enum';
import { AnnouncementPriority } from '../enums/announcement-priority.enum';
import { AnnouncementStatus } from '../enums/announcement-status.enum';
import { AnnouncementType } from '../enums/announcement-type.enum';

export class AnnouncementLinkResponseDto {
  id: string;
  label: string;
  url: string;
  sortOrder: number;
}

export class AnnouncementAudienceResponseDto {
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

export class AnnouncementFeedItemDto {
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

export class AnnouncementDetailResponseDto extends AnnouncementFeedItemDto {
  body: string;
  links: AnnouncementLinkResponseDto[];
}

export class AnnouncementFeedSummaryDto {
  unreadCount: number;
  pinnedCount: number;
  urgentCount: number;
}

export class AnnouncementFeedResponseDto {
  items: AnnouncementFeedItemDto[];
  total: number;
  page: number;
  limit: number;
  summary: AnnouncementFeedSummaryDto;
}

export class AnnouncementUnreadCountResponseDto {
  unreadCount: number;
}

export class AnnouncementReadResponseDto {
  announcementId: string;
  firstReadAt: string;
  lastReadAt: string;
}

export class AnnouncementAdminListItemDto {
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

export class AnnouncementAdminListResponseDto {
  items: AnnouncementAdminListItemDto[];
  total: number;
  page: number;
  limit: number;
}

export class AnnouncementAdminDetailResponseDto extends AnnouncementAdminListItemDto {
  body: string;
  links: AnnouncementLinkResponseDto[];
  audiences: AnnouncementAudienceResponseDto[];
  canEdit: boolean;
  canPublish: boolean;
  canArchive: boolean;
  canDelete: boolean;
}
