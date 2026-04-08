<template>
  <div class="student-operational-profile">
    <header class="student-operational-profile__header">
      <div class="student-operational-profile__header-copy">
        <div class="ui-eyebrow">Ficha operativa</div>
        <div class="student-operational-profile__title">{{ student.fullName }}</div>
        <div class="student-operational-profile__caption">
          {{ student.code }} · {{ classroomLabel }} · {{ shiftLabel }}
        </div>
      </div>

      <div class="student-operational-profile__chips">
        <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="badge">
          {{ student.code }}
        </q-chip>
        <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="school">
          {{ classroomLabel }}
        </q-chip>
      </div>
    </header>

    <section class="student-operational-profile__section">
      <div class="ui-eyebrow">Resumen actual</div>
      <div class="student-operational-profile__summary-grid q-mt-md">
        <div class="student-operational-profile__summary-item">
          <span class="student-operational-profile__label">Estado institucional</span>
          <span class="student-operational-profile__value">{{ institutionalStatusLabel }}</span>
        </div>
        <div class="student-operational-profile__summary-item">
          <span class="student-operational-profile__label">Situación actual</span>
          <span class="student-operational-profile__value">{{ situationLabel }}</span>
        </div>
        <div class="student-operational-profile__summary-item">
          <span class="student-operational-profile__label">Matrícula vigente</span>
          <span class="student-operational-profile__value">{{ classroomLabel }}</span>
        </div>
        <div class="student-operational-profile__summary-item">
          <span class="student-operational-profile__label">Turno</span>
          <span class="student-operational-profile__value">{{ shiftLabel }}</span>
        </div>
        <div class="student-operational-profile__summary-item">
          <span class="student-operational-profile__label">Estado de hoy</span>
          <span class="student-operational-profile__value">
            {{ student.todayStatus.operationalStatus }}
          </span>
        </div>
        <div class="student-operational-profile__summary-item">
          <span class="student-operational-profile__label">Entrada</span>
          <span class="student-operational-profile__value">
            {{ student.todayStatus.entry ? formatMarkedTime(student.todayStatus.entry.markedAt) : 'Pendiente' }}
          </span>
        </div>
        <div class="student-operational-profile__summary-item">
          <span class="student-operational-profile__label">Salida</span>
          <span class="student-operational-profile__value">
            {{ student.todayStatus.exit ? formatMarkedTime(student.todayStatus.exit.markedAt) : 'Pendiente' }}
          </span>
        </div>
      </div>
    </section>

    <section class="student-operational-profile__section">
      <div class="ui-eyebrow">Alertas y seguimiento</div>
      <div class="text-subtitle2 text-weight-bold q-mt-sm">
        Señales relevantes para la operación del aula
      </div>

      <div
        v-if="student.alerts.length === 0"
        class="student-operational-profile__empty-state q-mt-md"
      >
        <q-icon name="verified" size="24px" color="green-6" />
        <div class="text-subtitle2 text-weight-bold text-grey-8">Sin alertas activas</div>
        <p class="text-body2 text-grey-7 q-mb-none">
          No hay incidencias recientes de asistencia que requieran revisión inmediata.
        </p>
      </div>

      <div v-else class="student-operational-profile__alerts-list q-mt-md">
        <article
          v-for="alert in student.alerts"
          :key="`${alert.alertType}-${alert.studentId}`"
          class="student-operational-profile__alert"
        >
          <div class="student-operational-profile__alert-top">
            <q-chip
              square
              dense
              :color="getAttendanceAlertTone(alert.alertType).color"
              :text-color="getAttendanceAlertTone(alert.alertType).textColor"
              :icon="getAttendanceAlertTone(alert.alertType).icon"
            >
              {{ getAttendanceAlertLabel(alert.alertType) }}
            </q-chip>
            <div class="student-operational-profile__alert-title">{{ alert.title }}</div>
          </div>
          <p class="text-body2 text-grey-7 q-mb-none">
            {{ alert.description }}
          </p>
          <div class="student-operational-profile__alert-dates">
            <q-chip
              v-for="date in alert.recentDates"
              :key="`${alert.alertType}-${date}`"
              dense
              color="grey-2"
              text-color="grey-8"
            >
              {{ formatAlertDate(date) }}
            </q-chip>
          </div>
        </article>
      </div>
    </section>

    <div class="student-operational-profile__lower-grid">
      <section class="student-operational-profile__section">
        <div class="ui-eyebrow">Contacto básico</div>
        <div class="text-subtitle2 text-weight-bold q-mt-sm">
          Referencia familiar disponible
        </div>

        <div
          v-if="!primaryContact"
          class="student-operational-profile__empty-state q-mt-md"
        >
          <q-icon name="groups" size="24px" color="grey-6" />
          <div class="text-subtitle2 text-weight-bold text-grey-8">
            Sin contacto disponible
          </div>
          <p class="text-body2 text-grey-7 q-mb-none">
            No hay contactos familiares registrados para este estudiante.
          </p>
        </div>

        <div v-else class="student-operational-profile__contact-card q-mt-md">
          <div class="student-operational-profile__contact-top">
            <div>
              <div class="student-operational-profile__contact-name">{{ primaryContact.fullName }}</div>
              <div class="student-operational-profile__contact-meta">
                {{ primaryContact.relationship }}
              </div>
            </div>

            <div class="student-operational-profile__chips">
              <q-chip
                v-if="primaryContact.isPrimary"
                dense
                class="ui-stat-chip"
                color="red-1"
                text-color="red-10"
                icon="star"
              >
                Principal
              </q-chip>
              <q-chip
                v-if="primaryContact.isEmergencyContact"
                dense
                class="ui-stat-chip"
                color="orange-1"
                text-color="orange-10"
                icon="call"
              >
                Emergencia
              </q-chip>
            </div>
          </div>

          <div class="student-operational-profile__contact-list">
            <div class="student-operational-profile__contact-row">
              <span class="student-operational-profile__label">Teléfono principal</span>
              <span class="student-operational-profile__value">{{ primaryContact.phonePrimary }}</span>
            </div>
            <div
              v-if="primaryContact.phoneSecondary"
              class="student-operational-profile__contact-row"
            >
              <span class="student-operational-profile__label">Teléfono alterno</span>
              <span class="student-operational-profile__value">{{ primaryContact.phoneSecondary }}</span>
            </div>
            <div v-if="primaryContact.email" class="student-operational-profile__contact-row">
              <span class="student-operational-profile__label">Correo</span>
              <span class="student-operational-profile__value">{{ primaryContact.email }}</span>
            </div>
            <div
              v-if="primaryContact.isAuthorizedToCoordinate || primaryContact.isAuthorizedToPickUp"
              class="student-operational-profile__contact-row"
            >
              <span class="student-operational-profile__label">Autorizaciones</span>
              <span class="student-operational-profile__value">{{ getAuthorizationLabel(primaryContact) }}</span>
            </div>
            <div v-if="primaryContact.notes" class="student-operational-profile__contact-row">
              <span class="student-operational-profile__label">Observación</span>
              <span class="student-operational-profile__value">{{ primaryContact.notes }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="student-operational-profile__section">
        <div class="ui-eyebrow">Seguimiento reciente</div>
        <div class="text-subtitle2 text-weight-bold q-mt-sm">
          Observaciones, incidencias y actividad reciente
        </div>

        <div
          v-if="recentFollowUps.length > 0"
          class="student-operational-profile__activity-list q-mt-md"
        >
          <article
            v-for="item in recentFollowUps"
            :key="item.id"
            class="student-operational-profile__activity"
          >
            <div class="student-operational-profile__activity-top">
              <div class="student-operational-profile__activity-title">
                {{ item.recordType === 'incident' ? 'Incidencia interna' : 'Observación tutorial' }}
              </div>
              <q-chip dense color="grey-2" text-color="grey-8">
                {{ getFollowUpStatusLabel(item.status) }}
              </q-chip>
            </div>
            <div class="student-operational-profile__activity-meta">
              {{ formatItemDate(item.recordedAt) }} · {{ item.authorDisplayName }}
            </div>
            <div class="student-operational-profile__activity-note">
              {{ item.note }}
            </div>
          </article>
        </div>

        <div
          v-if="recentItems.length === 0"
          class="student-operational-profile__empty-state q-mt-md"
        >
          <q-icon name="history" size="24px" color="grey-6" />
          <div class="text-subtitle2 text-weight-bold text-grey-8">
            Sin actividad reciente
          </div>
          <p class="text-body2 text-grey-7 q-mb-none">
            Todavía no hay registros recientes para mostrar en esta ficha operativa.
          </p>
        </div>

        <div v-else class="student-operational-profile__activity-list q-mt-md">
          <article
            v-for="item in recentItems"
            :key="`${item.itemType}-${item.attendanceDate}-${item.markedAt ?? item.status}`"
            class="student-operational-profile__activity"
          >
            <div class="student-operational-profile__activity-top">
              <div class="student-operational-profile__activity-title">
                {{ getRecentItemTitle(item) }}
              </div>
              <q-chip
                v-if="item.itemType === 'absence'"
                dense
                :color="getAttendanceDayStatusTone(item.status as AttendanceDayStatusType).color"
                :text-color="getAttendanceDayStatusTone(item.status as AttendanceDayStatusType).textColor"
              >
                {{ getAttendanceDayStatusLabel(item.status as AttendanceDayStatusType) }}
              </q-chip>
              <q-chip
                v-else
                dense
                :color="getAttendanceRecordStatusTone(item.status as AttendanceRecordStatus).color"
                :text-color="getAttendanceRecordStatusTone(item.status as AttendanceRecordStatus).textColor"
              >
                {{ getAttendanceRecordStatusLabel(item.status as AttendanceRecordStatus) }}
              </q-chip>
            </div>
            <div class="student-operational-profile__activity-meta">
              {{ formatItemDate(item.attendanceDate) }}
              <span v-if="item.markedAt"> · {{ formatMarkedTime(item.markedAt) }}</span>
              <span v-if="item.itemType === 'mark' && item.source">
                · {{ item.source === 'qr' ? 'QR' : 'Manual' }}
              </span>
            </div>
            <div v-if="item.observation" class="student-operational-profile__activity-note">
              {{ item.observation }}
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type {
  AttendanceDayStatusType,
  AttendanceHistoryItem,
  AttendanceRecordStatus,
} from 'src/types/attendance';
import type { StudentContact, StudentDetail } from 'src/types/students';
import {
  getAttendanceAlertLabel,
  getAttendanceAlertTone,
} from 'src/utils/attendance-alerts';
import {
  getAttendanceDayStatusLabel,
  getAttendanceDayStatusTone,
  getAttendanceRecordStatusLabel,
  getAttendanceRecordStatusTone,
} from 'src/utils/attendance-status';

const props = defineProps<{
  student: StudentDetail;
}>();

const classroomLabel = computed(() => {
  if (
    props.student.grade === null ||
    !props.student.section
  ) {
    return 'Sin asignación vigente';
  }

  return `${props.student.grade} ${props.student.section}`;
});

const shiftLabel = computed(() => {
  if (!props.student.shift) {
    return 'Sin turno vigente';
  }

  return props.student.shift === 'morning' ? 'Turno mañana' : 'Turno tarde';
});

const institutionalStatusLabel = computed(() => {
  if (props.student.institutionalStatus === 'withdrawn') {
    return 'Retirado';
  }

  if (props.student.institutionalStatus === 'transferred') {
    return 'Trasladado';
  }

  if (props.student.institutionalStatus === 'graduated') {
    return 'Egresado';
  }

  if (props.student.institutionalStatus === 'promoted') {
    return 'Promovido';
  }

  if (props.student.institutionalStatus === 'inactive') {
    return 'Inactivo';
  }

  if (props.student.institutionalStatus === 'observed') {
    return 'Observado';
  }

  return 'Activo';
});

const primaryContact = computed<StudentContact | null>(() => {
  const contacts = props.student.contacts ?? [];
  return contacts.find((contact) => contact.isPrimary)
    ?? contacts.find((contact) => contact.isEmergencyContact)
    ?? contacts[0]
    ?? null;
});

const situationLabel = computed(() => {
  if (!props.student.currentSituation) {
    return 'Sin registrar';
  }

  return `${institutionalStatusLabel.value} · ${getMovementLabel(props.student.currentSituation.movementType)}`;
});

const recentFollowUps = computed(() => props.student.followUps.slice(0, 3));
const recentItems = computed(() => props.student.recentItems.slice(0, 5));

function formatAlertDate(date: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    timeZone: 'America/Lima',
  }).format(new Date(`${date}T00:00:00`));
}

function formatItemDate(date: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeZone: 'America/Lima',
  }).format(new Date(`${date}T00:00:00`));
}

function formatMarkedTime(markedAt: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Lima',
  }).format(new Date(markedAt));
}

function getRecentItemTitle(item: AttendanceHistoryItem): string {
  if (item.itemType === 'absence') {
    return getAttendanceDayStatusLabel(item.status as AttendanceDayStatusType);
  }

  return item.markType === 'entry' ? 'Entrada registrada' : 'Salida registrada';
}

function getMovementLabel(value: string): string {
  if (value === 'new_admission') {
    return 'Ingreso nuevo';
  }

  if (value === 'transfer_in') {
    return 'Traslado de entrada';
  }

  if (value === 'transfer_out') {
    return 'Traslado de salida';
  }

  if (value === 'withdrawal') {
    return 'Retiro';
  }

  return 'Continuidad';
}

function getAuthorizationLabel(contact: StudentContact): string {
  const parts: string[] = [];

  if (contact.isAuthorizedToCoordinate) {
    parts.push('Coordinar');
  }

  if (contact.isAuthorizedToPickUp) {
    parts.push('Recoger');
  }

  return parts.join(' · ');
}

function getFollowUpStatusLabel(status: string): string {
  if (status === 'in_progress') {
    return 'En seguimiento';
  }

  if (status === 'closed') {
    return 'Cerrado';
  }

  return 'Abierto';
}
</script>
