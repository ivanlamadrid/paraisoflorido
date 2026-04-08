import type {
  AnnouncementPriority,
  AnnouncementReadState,
  AnnouncementStatus,
  AnnouncementType,
} from 'src/types/announcements';
import type { StudentShift } from 'src/types/attendance';

export function getAnnouncementPriorityLabel(
  priority: AnnouncementPriority,
): string {
  if (priority === 'urgent') {
    return 'Urgente';
  }

  if (priority === 'important') {
    return 'Importante';
  }

  return 'Normal';
}

export function getAnnouncementPriorityTone(
  priority: AnnouncementPriority,
): { color: string; textColor: string; icon: string } {
  if (priority === 'urgent') {
    return {
      color: 'red-1',
      textColor: 'red-10',
      icon: 'priority_high',
    };
  }

  if (priority === 'important') {
    return {
      color: 'amber-1',
      textColor: 'amber-10',
      icon: 'campaign',
    };
  }

  return {
    color: 'grey-2',
    textColor: 'grey-9',
    icon: 'notifications_none',
  };
}

export function getAnnouncementStatusLabel(status: AnnouncementStatus): string {
  if (status === 'scheduled') {
    return 'Programado';
  }

  if (status === 'published') {
    return 'Publicado';
  }

  if (status === 'archived') {
    return 'Archivado';
  }

  return 'Borrador';
}

export function getAnnouncementStatusTone(
  status: AnnouncementStatus,
): { color: string; textColor: string; icon: string } {
  if (status === 'published') {
    return {
      color: 'green-1',
      textColor: 'green-10',
      icon: 'public',
    };
  }

  if (status === 'scheduled') {
    return {
      color: 'blue-1',
      textColor: 'blue-10',
      icon: 'schedule',
    };
  }

  if (status === 'archived') {
    return {
      color: 'grey-3',
      textColor: 'grey-9',
      icon: 'archive',
    };
  }

  return {
    color: 'grey-2',
    textColor: 'grey-9',
    icon: 'edit_note',
  };
}

export function getAnnouncementTypeLabel(type: AnnouncementType): string {
  if (type === 'administrative') {
    return 'Gestión escolar';
  }

  if (type === 'academic') {
    return 'Tutoría y bienestar';
  }

  if (type === 'attendance') {
    return 'Asistencia y puntualidad';
  }

  return 'Institucional';
}

export function getAnnouncementTypeTone(
  type: AnnouncementType,
): { color: string; textColor: string; icon: string } {
  if (type === 'administrative') {
    return {
      color: 'blue-1',
      textColor: 'blue-10',
      icon: 'apartment',
    };
  }

  if (type === 'academic') {
    return {
      color: 'pink-1',
      textColor: 'pink-10',
      icon: 'volunteer_activism',
    };
  }

  if (type === 'attendance') {
    return {
      color: 'teal-1',
      textColor: 'teal-10',
      icon: 'fact_check',
    };
  }

  return {
    color: 'grey-2',
    textColor: 'grey-9',
    icon: 'campaign',
  };
}

export function formatAnnouncementDate(dateTime: string | null): string {
  if (!dateTime) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Lima',
  }).format(new Date(dateTime));
}

export function formatAnnouncementDateOnly(dateTime: string | null): string {
  if (!dateTime) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'long',
    timeZone: 'America/Lima',
  }).format(new Date(dateTime));
}

export function toDateTimeLocalInput(dateTime: string | null): string {
  if (!dateTime) {
    return '';
  }

  const date = new Date(dateTime);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function fromDateTimeLocalInput(value: string): string | undefined {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return undefined;
  }

  return new Date(trimmedValue).toISOString();
}

export function getShiftLabel(shift: StudentShift | null | undefined): string {
  if (shift === 'morning') {
    return 'Mañana';
  }

  if (shift === 'afternoon') {
    return 'Tarde';
  }

  return 'Sin turno';
}

export const announcementTypeOptions = [
  { label: 'Institucional', value: 'institutional' },
  { label: 'Gestión escolar', value: 'administrative' },
  { label: 'Tutoría y bienestar', value: 'academic' },
  { label: 'Asistencia y puntualidad', value: 'attendance' },
] as const;

export const announcementPriorityOptions = [
  { label: 'Normal', value: 'normal' },
  { label: 'Importante', value: 'important' },
  { label: 'Urgente', value: 'urgent' },
] as const;

export const announcementStatusOptions = [
  { label: 'Borrador', value: 'draft' },
  { label: 'Programado', value: 'scheduled' },
  { label: 'Publicado', value: 'published' },
  { label: 'Archivado', value: 'archived' },
] as const;

export const announcementReadStateOptions: {
  label: string;
  value: AnnouncementReadState;
}[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Sin leer', value: 'unread' },
  { label: 'Leídos', value: 'read' },
];
