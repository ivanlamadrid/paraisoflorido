import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { getAnnouncementFeed } from 'src/services/api/announcements-api';
import { getMyAttendanceHistory } from 'src/services/api/attendance-api';
import type { AnnouncementFeedItem } from 'src/types/announcements';
import type { AttendanceHistoryItem, AttendanceMarkType } from 'src/types/attendance';

const STORAGE_KEY_PREFIX = 'colegio.student.in-app-notifications';
const POLL_INTERVAL_MS = 60_000;
const ANNOUNCEMENT_LIMIT = 12;
const MAX_PERSISTED_IDS = 48;
const MAX_PERSISTED_MARK_KEYS = 12;

type StudentNotificationSnapshot = {
  announcementIds: string[];
  attendanceDate: string | null;
  attendanceKeys: string[];
};

type RefreshOptions = {
  allowToast?: boolean;
};

export type StudentAnnouncementToast = {
  key: string;
  title: string;
  message: string;
  actionLabel: string;
  targetPath: string;
  variant: 'default' | 'emphasis';
};

export type StudentAttendanceToast = {
  key: string;
  markType: AttendanceMarkType;
  message: string;
};

function canUseBrowser(): boolean {
  return typeof window !== 'undefined';
}

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}.${userId}`;
}

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeSnapshot(
  value: Partial<StudentNotificationSnapshot> | null | undefined,
): StudentNotificationSnapshot {
  return {
    announcementIds: Array.isArray(value?.announcementIds)
      ? value.announcementIds.filter((item): item is string => typeof item === 'string')
      : [],
    attendanceDate: typeof value?.attendanceDate === 'string' ? value.attendanceDate : null,
    attendanceKeys: Array.isArray(value?.attendanceKeys)
      ? value.attendanceKeys.filter((item): item is string => typeof item === 'string')
      : [],
  };
}

function readSnapshot(userId: string): StudentNotificationSnapshot {
  if (!canUseBrowser()) {
    return normalizeSnapshot(null);
  }

  const rawValue = window.localStorage.getItem(getStorageKey(userId));

  if (!rawValue) {
    return normalizeSnapshot(null);
  }

  try {
    return normalizeSnapshot(JSON.parse(rawValue) as Partial<StudentNotificationSnapshot>);
  } catch {
    window.localStorage.removeItem(getStorageKey(userId));
    return normalizeSnapshot(null);
  }
}

function persistSnapshot(userId: string, snapshot: StudentNotificationSnapshot): void {
  if (!canUseBrowser()) {
    return;
  }

  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(snapshot));
}

function mergeUniqueIds(values: string[], limit: number): string[] {
  return Array.from(new Set(values)).slice(-limit);
}

function getAttendanceMarkKey(item: AttendanceHistoryItem): string | null {
  if (item.itemType !== 'mark' || !item.markType || !item.markedAt) {
    return null;
  }

  return `${item.attendanceDate}:${item.markType}:${item.markedAt}`;
}

function sortAnnouncementItems(
  left: AnnouncementFeedItem,
  right: AnnouncementFeedItem,
): number {
  const leftRank = Number(left.priority === 'urgent' || left.isPinned);
  const rightRank = Number(right.priority === 'urgent' || right.isPinned);

  if (leftRank !== rightRank) {
    return rightRank - leftRank;
  }

  return new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime();
}

export const useStudentNotificationsStore = defineStore('student-notifications', () => {
  const unreadAnnouncements = ref<AnnouncementFeedItem[]>([]);
  const unreadCount = ref(0);
  const unreadPinnedCount = ref(0);
  const unreadUrgentCount = ref(0);
  const isLoadingAnnouncements = ref(false);
  const isRefreshingAttendance = ref(false);
  const announcementToastQueue = ref<StudentAnnouncementToast[]>([]);
  const attendanceToastQueue = ref<StudentAttendanceToast[]>([]);
  const activeStudentUserId = ref<string | null>(null);
  const announcementsBootstrapped = ref(false);
  const attendanceBootstrapped = ref(false);

  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let visibilityHandler: (() => void) | null = null;

  const hasUnreadAnnouncements = computed(() => unreadCount.value > 0);
  const highlightedAnnouncement = computed(() => {
    const sortedItems = [...unreadAnnouncements.value].sort(sortAnnouncementItems);
    return sortedItems[0] ?? null;
  });
  const homeAnnouncements = computed(() => {
    const highlightedId = highlightedAnnouncement.value?.id ?? null;

    return unreadAnnouncements.value
      .filter((item) => item.id !== highlightedId)
      .sort(
        (left, right) =>
          new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime(),
      )
      .slice(0, 3);
  });
  const nextAnnouncementToast = computed(
    () => announcementToastQueue.value[0] ?? null,
  );
  const nextAttendanceToast = computed(() => attendanceToastQueue.value[0] ?? null);

  function clearQueues(): void {
    announcementToastQueue.value = [];
    attendanceToastQueue.value = [];
  }

  function resetRuntimeState(): void {
    unreadAnnouncements.value = [];
    unreadCount.value = 0;
    unreadPinnedCount.value = 0;
    unreadUrgentCount.value = 0;
    announcementsBootstrapped.value = false;
    attendanceBootstrapped.value = false;
    clearQueues();
  }

  function stop(): void {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }

    if (visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', visibilityHandler);
      visibilityHandler = null;
    }
  }

  function getActiveSnapshot(): StudentNotificationSnapshot | null {
    const userId = activeStudentUserId.value;

    if (!userId) {
      return null;
    }

    return readSnapshot(userId);
  }

  function saveActiveSnapshot(snapshot: StudentNotificationSnapshot): void {
    const userId = activeStudentUserId.value;

    if (!userId) {
      return;
    }

    persistSnapshot(userId, snapshot);
  }

  function enqueueAnnouncementToast(items: AnnouncementFeedItem[]): void {
    if (items.length === 0) {
      return;
    }

    const sortedItems = [...items].sort(sortAnnouncementItems);
    const primaryItem = sortedItems[0];
    const isEmphasis = sortedItems.some(
      (item) => item.priority === 'urgent' || item.isPinned,
    );

    if (!primaryItem) {
      return;
    }

    if (sortedItems.length === 1) {
      announcementToastQueue.value.push({
        key: `announcement:${primaryItem.id}`,
        title:
          primaryItem.priority === 'urgent' || primaryItem.isPinned
            ? 'Comunicado destacado'
            : 'Nuevo comunicado',
        message: primaryItem.title,
        actionLabel: 'Abrir',
        targetPath: `/comunicados/${primaryItem.id}`,
        variant: isEmphasis ? 'emphasis' : 'default',
      });
      return;
    }

    announcementToastQueue.value.push({
      key: `announcement-batch:${sortedItems.map((item) => item.id).join(',')}`,
      title: 'Tienes comunicados nuevos',
      message: isEmphasis
        ? 'Hay avisos nuevos y al menos uno requiere atención prioritaria.'
        : `${sortedItems.length} comunicados nuevos ya están disponibles en tu feed.`,
      actionLabel: 'Ver',
      targetPath: '/comunicados',
      variant: isEmphasis ? 'emphasis' : 'default',
    });
  }

  function enqueueAttendanceToast(item: AttendanceHistoryItem): void {
    if (item.itemType !== 'mark' || !item.markType) {
      return;
    }

    attendanceToastQueue.value.push({
      key: getAttendanceMarkKey(item) ?? `${item.attendanceDate}:${item.markType}`,
      markType: item.markType,
      message:
        item.markType === 'entry'
          ? 'Tu entrada fue registrada.'
          : 'Tu salida fue registrada.',
    });
  }

  async function refreshAnnouncements(
    options: RefreshOptions = {},
  ): Promise<void> {
    if (!activeStudentUserId.value) {
      return;
    }

    isLoadingAnnouncements.value = true;

    try {
      const response = await getAnnouncementFeed({
        page: 1,
        limit: ANNOUNCEMENT_LIMIT,
        readState: 'unread',
      });

      unreadAnnouncements.value = response.items;
      unreadCount.value = response.summary.unreadCount;
      unreadPinnedCount.value = response.summary.pinnedCount;
      unreadUrgentCount.value = response.summary.urgentCount;

      const snapshot = getActiveSnapshot();

      if (!snapshot) {
        announcementsBootstrapped.value = true;
        return;
      }

      const currentUnreadIds = response.items.map((item) => item.id);

      if (!announcementsBootstrapped.value) {
        saveActiveSnapshot({
          ...snapshot,
          announcementIds:
            snapshot.announcementIds.length > 0
              ? snapshot.announcementIds
              : mergeUniqueIds(currentUnreadIds, MAX_PERSISTED_IDS),
        });
        announcementsBootstrapped.value = true;
        return;
      }

      const freshItems = response.items.filter(
        (item) => !snapshot.announcementIds.includes(item.id),
      );

      if (options.allowToast !== false && freshItems.length > 0) {
        enqueueAnnouncementToast(freshItems);
      }

      saveActiveSnapshot({
        ...snapshot,
        announcementIds: mergeUniqueIds(
          [...snapshot.announcementIds, ...currentUnreadIds],
          MAX_PERSISTED_IDS,
        ),
      });
    } catch {
      // Keep the last successful snapshot and try again on the next refresh cycle.
    } finally {
      isLoadingAnnouncements.value = false;
    }
  }

  async function refreshAttendance(
    options: RefreshOptions = {},
  ): Promise<void> {
    if (!activeStudentUserId.value) {
      return;
    }

    isRefreshingAttendance.value = true;

    try {
      const todayDate = getTodayIsoDate();
      const response = await getMyAttendanceHistory({
        from: todayDate,
        to: todayDate,
        page: 1,
        limit: 20,
      });

      const marks = response.items
        .filter(
          (item) =>
            item.itemType === 'mark' &&
            (item.markType === 'entry' || item.markType === 'exit') &&
            Boolean(item.markedAt),
        )
        .sort((left, right) => {
          const leftDate = left.markedAt ? new Date(left.markedAt).getTime() : 0;
          const rightDate = right.markedAt ? new Date(right.markedAt).getTime() : 0;
          return leftDate - rightDate;
        });

      const markKeys = marks
        .map((item) => getAttendanceMarkKey(item))
        .filter((item): item is string => Boolean(item));

      const snapshot = getActiveSnapshot();

      if (!snapshot) {
        attendanceBootstrapped.value = true;
        return;
      }

      if (!attendanceBootstrapped.value || snapshot.attendanceDate !== todayDate) {
        saveActiveSnapshot({
          ...snapshot,
          attendanceDate: todayDate,
          attendanceKeys: mergeUniqueIds(markKeys, MAX_PERSISTED_MARK_KEYS),
        });
        attendanceBootstrapped.value = true;
        return;
      }

      const freshMarks = marks.filter((item) => {
        const key = getAttendanceMarkKey(item);
        return key !== null && !snapshot.attendanceKeys.includes(key);
      });

      if (options.allowToast !== false) {
        freshMarks.forEach((item) => enqueueAttendanceToast(item));
      }

      saveActiveSnapshot({
        ...snapshot,
        attendanceDate: todayDate,
        attendanceKeys: mergeUniqueIds(
          [...snapshot.attendanceKeys, ...markKeys],
          MAX_PERSISTED_MARK_KEYS,
        ),
      });
      attendanceBootstrapped.value = true;
    } catch {
      // Preserve the previous mark snapshot when the refresh cannot complete.
    } finally {
      isRefreshingAttendance.value = false;
    }
  }

  async function refreshAll(options: RefreshOptions = {}): Promise<void> {
    await Promise.all([
      refreshAnnouncements(options),
      refreshAttendance(options),
    ]);
  }

  function consumeAnnouncementToast(): StudentAnnouncementToast | null {
    return announcementToastQueue.value.shift() ?? null;
  }

  function consumeAttendanceToast(): StudentAttendanceToast | null {
    return attendanceToastQueue.value.shift() ?? null;
  }

  function start(userId: string): void {
    if (!userId) {
      return;
    }

    if (activeStudentUserId.value !== userId) {
      stop();
      activeStudentUserId.value = userId;
      resetRuntimeState();
    }

    if (!pollTimer) {
      pollTimer = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
          return;
        }

        void refreshAll();
      }, POLL_INTERVAL_MS);
    }

    if (!visibilityHandler && typeof document !== 'undefined') {
      visibilityHandler = () => {
        if (document.visibilityState === 'visible') {
          void refreshAll();
        }
      };

      document.addEventListener('visibilitychange', visibilityHandler);
    }

    void refreshAll();
  }

  function reset(): void {
    stop();
    activeStudentUserId.value = null;
    resetRuntimeState();
  }

  return {
    unreadAnnouncements,
    unreadCount,
    unreadPinnedCount,
    unreadUrgentCount,
    isLoadingAnnouncements,
    isRefreshingAttendance,
    hasUnreadAnnouncements,
    highlightedAnnouncement,
    homeAnnouncements,
    nextAnnouncementToast,
    nextAttendanceToast,
    start,
    stop,
    reset,
    refreshAnnouncements,
    refreshAttendance,
    refreshAll,
    consumeAnnouncementToast,
    consumeAttendanceToast,
  };
});
