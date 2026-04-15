export const apiCacheTags = {
  adminAnnouncements: 'admin-announcements',
  announcementDetail: 'announcement-detail',
  announcementFeed: 'announcement-feed',
  institution: 'institution',
  personnelUsers: 'personnel-users',
  studentDetail: 'student-detail',
  studentFollowUpsOverview: 'student-follow-ups-overview',
  studentProfile: 'student-profile',
  students: 'students',
  tutorAssignments: 'tutor-assignments',
} as const;

export const apiCacheTtls = {
  adminAnnouncements: 20_000,
  announcementDetail: 30_000,
  announcementFeed: 20_000,
  institutionSettings: 120_000,
  personnelUsers: 30_000,
  studentDetail: 30_000,
  studentFollowUpsOverview: 20_000,
  studentProfile: 45_000,
  students: 30_000,
  tutorAssignments: 60_000,
} as const;
