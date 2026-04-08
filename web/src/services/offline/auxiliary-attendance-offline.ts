import type {
  AttendanceOfflineContextResponse,
  AttendanceOfflineContextStudent,
  AttendanceOfflineSyncItemPayload,
  AttendanceOfflineSyncResponse,
  AttendanceRecordStatus,
  AttendanceSource,
  AttendanceMarkType,
  StudentShift,
} from 'src/types/attendance';

const AUXILIARY_OFFLINE_CONTEXT_KEY = 'colegio.auxiliary.offline.context';
const AUXILIARY_OFFLINE_QUEUE_KEY = 'colegio.auxiliary.offline.queue';
const AUXILIARY_OFFLINE_SYNC_META_KEY = 'colegio.auxiliary.offline.sync-meta';

export interface AuxiliaryOfflineQueueItem
  extends AttendanceOfflineSyncItemPayload {
  fullName: string;
  queuedAt: string;
  syncError: string | null;
}

export interface AuxiliaryOfflineSyncMeta {
  lastSuccessfulSyncAt: string | null;
  lastSyncAttemptAt: string | null;
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined';
}

function readStorage<T>(key: string, fallback: T): T {
  if (!canUseStorage()) {
    return fallback;
  }

  const stored = window.localStorage.getItem(key);

  if (!stored) {
    return fallback;
  }

  try {
    return JSON.parse(stored) as T;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

function writeStorage(key: string, value: unknown): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function createClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getAuxiliaryOfflineContextSnapshot():
  | AttendanceOfflineContextResponse
  | null {
  return readStorage<AttendanceOfflineContextResponse | null>(
    AUXILIARY_OFFLINE_CONTEXT_KEY,
    null,
  );
}

export function storeAuxiliaryOfflineContextSnapshot(
  snapshot: AttendanceOfflineContextResponse,
): void {
  const currentSnapshot = getAuxiliaryOfflineContextSnapshot();

  if (
    currentSnapshot &&
    currentSnapshot.context.schoolYear !== snapshot.context.schoolYear
  ) {
    clearAuxiliaryOfflineQueue();
  }

  writeStorage(AUXILIARY_OFFLINE_CONTEXT_KEY, snapshot);
}

export function getAuxiliaryOfflineQueue(): AuxiliaryOfflineQueueItem[] {
  return readStorage<AuxiliaryOfflineQueueItem[]>(AUXILIARY_OFFLINE_QUEUE_KEY, []);
}

function saveAuxiliaryOfflineQueue(queue: AuxiliaryOfflineQueueItem[]): void {
  writeStorage(AUXILIARY_OFFLINE_QUEUE_KEY, queue);
}

export function clearAuxiliaryOfflineQueue(): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(AUXILIARY_OFFLINE_QUEUE_KEY);
}

export function getAuxiliaryOfflineSyncMeta(): AuxiliaryOfflineSyncMeta {
  return readStorage<AuxiliaryOfflineSyncMeta>(AUXILIARY_OFFLINE_SYNC_META_KEY, {
    lastSuccessfulSyncAt: null,
    lastSyncAttemptAt: null,
  });
}

export function markAuxiliaryOfflineSyncAttempt(): void {
  const current = getAuxiliaryOfflineSyncMeta();
  writeStorage(AUXILIARY_OFFLINE_SYNC_META_KEY, {
    ...current,
    lastSyncAttemptAt: new Date().toISOString(),
  } satisfies AuxiliaryOfflineSyncMeta);
}

function markAuxiliaryOfflineSyncSuccess(): void {
  const current = getAuxiliaryOfflineSyncMeta();
  writeStorage(AUXILIARY_OFFLINE_SYNC_META_KEY, {
    ...current,
    lastSuccessfulSyncAt: new Date().toISOString(),
    lastSyncAttemptAt: new Date().toISOString(),
  } satisfies AuxiliaryOfflineSyncMeta);
}

function alreadyQueued(
  queue: AuxiliaryOfflineQueueItem[],
  item: AttendanceOfflineQueueIdentity,
): boolean {
  return queue.some((queuedItem) => {
    const sameStudent =
      (item.studentId && queuedItem.studentId === item.studentId) ||
      (item.studentCode && queuedItem.studentCode === item.studentCode);

    return (
      sameStudent &&
      queuedItem.attendanceDate === item.attendanceDate &&
      queuedItem.markType === item.markType
    );
  });
}

type AttendanceOfflineQueueIdentity = {
  studentId?: string | undefined;
  studentCode?: string | undefined;
  attendanceDate: string;
  markType: AttendanceMarkType;
};

type BaseQueuedItemInput = {
  source: AttendanceSource;
  attendanceDate: string;
  schoolYear: number;
  grade: number;
  section: string;
  shift: StudentShift;
  markType: AttendanceMarkType;
  status?: AttendanceRecordStatus | undefined;
  observation?: string | undefined;
  fullName: string;
  studentId?: string | undefined;
  studentCode?: string | undefined;
};

function queueOfflineItem(input: BaseQueuedItemInput): AuxiliaryOfflineQueueItem {
  const queue = getAuxiliaryOfflineQueue();

  if (
    alreadyQueued(queue, {
      studentId: input.studentId,
      studentCode: input.studentCode,
      attendanceDate: input.attendanceDate,
      markType: input.markType,
    })
  ) {
    throw new Error(
      'Ya existe una marca pendiente para este estudiante y tipo de registro en la misma fecha.',
    );
  }

  const queuedItem: AuxiliaryOfflineQueueItem = {
    clientId: createClientId(),
    source: input.source,
    studentId: input.studentId,
    studentCode: input.studentCode,
    attendanceDate: input.attendanceDate,
    markedAt: new Date().toISOString(),
    schoolYear: input.schoolYear,
    grade: input.grade,
    section: input.section,
    shift: input.shift,
    markType: input.markType,
    status: input.status,
    observation: input.observation,
    fullName: input.fullName,
    queuedAt: new Date().toISOString(),
    syncError: null,
  };

  saveAuxiliaryOfflineQueue([queuedItem, ...queue]);
  return queuedItem;
}

export function queueOfflineScanAttendance(input: {
  student: AttendanceOfflineContextStudent;
  attendanceDate: string;
  schoolYear: number;
  markType: AttendanceMarkType;
  observation?: string;
}): AuxiliaryOfflineQueueItem {
  return queueOfflineItem({
    source: 'qr',
    studentCode: input.student.code,
    attendanceDate: input.attendanceDate,
    schoolYear: input.schoolYear,
    grade: input.student.grade,
    section: input.student.section,
    shift: input.student.shift,
    markType: input.markType,
    observation: input.observation,
    fullName: input.student.fullName,
  });
}

export function queueOfflineManualAttendance(input: {
  student: AttendanceOfflineContextStudent;
  attendanceDate: string;
  schoolYear: number;
  markType: AttendanceMarkType;
  status?: AttendanceRecordStatus;
  observation?: string;
}): AuxiliaryOfflineQueueItem {
  return queueOfflineItem({
    source: 'manual',
    studentId: input.student.studentId,
    attendanceDate: input.attendanceDate,
    schoolYear: input.schoolYear,
    grade: input.student.grade,
    section: input.student.section,
    shift: input.student.shift,
    markType: input.markType,
    status: input.status,
    observation: input.observation,
    fullName: input.student.fullName,
  });
}

export function findOfflineStudentByCode(
  code: string,
): AttendanceOfflineContextStudent | null {
  const snapshot = getAuxiliaryOfflineContextSnapshot();

  if (!snapshot) {
    return null;
  }

  const normalizedCode = code.trim().toLowerCase();
  return (
    snapshot.students.find((student) => student.code === normalizedCode) ?? null
  );
}

export function getOfflineStudentsForClassroom(input: {
  grade: number;
  section: string;
  shift: StudentShift;
}): AttendanceOfflineContextStudent[] {
  const snapshot = getAuxiliaryOfflineContextSnapshot();

  if (!snapshot) {
    return [];
  }

  return snapshot.students.filter(
    (student) =>
      student.grade === input.grade &&
      student.section === input.section &&
      student.shift === input.shift,
  );
}

export function applyAuxiliaryOfflineSyncResult(
  result: AttendanceOfflineSyncResponse,
): void {
  const currentQueue = getAuxiliaryOfflineQueue();
  const nextQueue = currentQueue
    .map((queuedItem) => {
      const syncItem = result.items.find(
        (resultItem) => resultItem.clientId === queuedItem.clientId,
      );

      if (!syncItem) {
        return queuedItem;
      }

      if (syncItem.status === 'accepted' || syncItem.status === 'duplicate') {
        return null;
      }

      return {
        ...queuedItem,
        syncError: syncItem.message,
      } satisfies AuxiliaryOfflineQueueItem;
    })
    .filter((item): item is AuxiliaryOfflineQueueItem => Boolean(item));

  saveAuxiliaryOfflineQueue(nextQueue);

  if (result.summary.acceptedItems > 0 || result.summary.duplicateItems > 0) {
    markAuxiliaryOfflineSyncSuccess();
  }
}
