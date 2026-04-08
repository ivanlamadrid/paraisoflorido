<template>
  <div
    class="student-profile-panel"
    :class="{ 'student-profile-panel--student': isStudentInstitutionalLayout }"
  >
    <div
      class="student-profile-panel__layout"
      :class="{ 'student-profile-panel__layout--single': !showCredential }"
    >
      <div v-if="showCredential" class="student-profile-panel__aside">
        <StudentQrCredentialCard :student="student" />

        <q-card flat bordered class="admin-card student-profile-panel__summary-card">
          <q-card-section class="ui-card-body">
            <div class="ui-eyebrow">Resumen actual</div>
            <div class="text-subtitle2 text-weight-bold q-mt-sm">
              Identificación institucional y estado operativo
            </div>

            <div class="row q-gutter-sm q-mt-md">
              <q-chip
                class="ui-stat-chip"
                :color="student.isActive ? 'red-1' : 'grey-3'"
                :text-color="student.isActive ? 'red-10' : 'grey-8'"
              >
                {{ student.isActive ? 'Activo' : 'Inactivo' }}
              </q-chip>
              <q-chip
                class="ui-stat-chip"
                :color="institutionalStatusTone.color"
                :text-color="institutionalStatusTone.textColor"
                icon="fact_check"
              >
                {{ institutionalStatusLabel }}
              </q-chip>
            </div>

            <div class="context-summary q-mt-lg">
              <div class="context-summary__item">
                <span class="context-summary__label">Documento</span>
                <span class="context-summary__value">{{ student.document || 'Sin documento' }}</span>
              </div>
              <div class="context-summary__item">
                <span class="context-summary__label">Matrícula vigente</span>
                <span class="context-summary__value">{{ classroomLabel }}</span>
              </div>
              <div class="context-summary__item">
                <span class="context-summary__label">Año lectivo</span>
                <span class="context-summary__value">{{ student.schoolYear ?? 'Sin asignación' }}</span>
              </div>
              <div
                v-if="viewerRole !== 'auxiliary'"
                class="context-summary__item"
              >
                <span class="context-summary__label">Usuario</span>
                <span class="context-summary__value">{{ student.username }}</span>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <q-card flat bordered class="admin-card student-profile-panel__main">
        <q-card-section class="ui-card-body">
          <div class="row items-start justify-between q-col-gutter-md">
            <div class="col-12 col-lg">
              <div class="ui-eyebrow">{{ headerEyebrow }}</div>
              <div class="text-subtitle1 text-weight-bold q-mt-sm">
                {{ headerTitle }}
              </div>
              <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                {{ headerDescription }}
              </p>
            </div>
            <div v-if="!isStudentInstitutionalLayout" class="col-12 col-lg-auto">
              <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="badge">
                {{ student.code }}
              </q-chip>
            </div>
          </div>

          <div
            v-if="isStudentInstitutionalLayout"
            class="student-profile-panel__header-meta q-mt-lg"
          >
            <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="badge">
              {{ student.code }}
            </q-chip>
            <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="school">
              {{ classroomLabel }}
            </q-chip>
            <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="schedule">
              {{ shiftLabel }}
            </q-chip>
            <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="calendar_month">
              {{ student.schoolYear ?? 'Sin asignación' }}
            </q-chip>
          </div>

          <div
            v-if="isStudentInstitutionalLayout"
            class="student-profile-panel__institution-strip q-mt-lg"
          >
            <div class="student-profile-panel__institution-item">
              <span class="student-profile-panel__institution-label">Estado institucional</span>
              <span class="student-profile-panel__institution-value">{{ institutionalStatusLabel }}</span>
            </div>
            <div class="student-profile-panel__institution-item">
              <span class="student-profile-panel__institution-label">Aula actual</span>
              <span class="student-profile-panel__institution-value">{{ classroomLabel }}</span>
            </div>
            <div class="student-profile-panel__institution-item">
              <span class="student-profile-panel__institution-label">Turno</span>
              <span class="student-profile-panel__institution-value">{{ shiftLabel }}</span>
            </div>
            <div class="student-profile-panel__institution-item">
              <span class="student-profile-panel__institution-label">Año lectivo</span>
              <span class="student-profile-panel__institution-value">{{ student.schoolYear ?? 'Sin asignación' }}</span>
            </div>
          </div>

          <div
            v-else
            class="student-profile-summary-grid q-mt-lg"
          >
            <StatSummaryCard
              label="Asistencia reciente"
              :value="`${student.recentSummary.attendancePercentage.toFixed(1)} %`"
              icon="insights"
              tone="primary"
              :caption="`${student.recentSummary.attendedDays} días con registro en ${student.recentSummary.schoolDays} días hábiles recientes.`"
            />
            <StatSummaryCard
              label="Entradas / salidas"
              :value="`${student.recentSummary.entriesRegistered} / ${student.recentSummary.exitsRegistered}`"
              icon="swap_vert"
              tone="positive"
              :caption="`${student.recentSummary.completeDays} días completos en el periodo.`"
            />
            <StatSummaryCard
              label="Ausencias"
              :value="student.recentSummary.absences"
              icon="event_busy"
              tone="warning"
              :caption="`${student.recentSummary.justifiedAbsences} justificadas y ${student.recentSummary.unjustifiedAbsences} no justificadas.`"
            />
            <StatSummaryCard
              label="Tardanzas e incompletos"
              :value="`${student.recentSummary.lateEntries} / ${student.recentSummary.incompleteRecords}`"
              icon="schedule"
              tone="info"
              :caption="`${student.recentSummary.earlyDepartures} salidas anticipadas en el mismo periodo.`"
            />
          </div>

          <div class="student-profile-panel__sections q-mt-xl">
            <section class="student-profile-panel__section student-profile-panel__section--identity">
              <div class="ui-eyebrow">Identidad y matrícula</div>
              <div class="text-subtitle2 text-weight-bold q-mt-sm">
                Datos básicos del estudiante
              </div>

              <div class="student-profile-panel__details-grid q-mt-md">
                <div class="student-profile-panel__detail-card">
                  <span class="student-profile-panel__detail-label">Nombre completo</span>
                  <span class="student-profile-panel__detail-value">{{ student.fullName }}</span>
                </div>
                <div class="student-profile-panel__detail-card">
                  <span class="student-profile-panel__detail-label">Código</span>
                  <span class="student-profile-panel__detail-value">{{ student.code }}</span>
                </div>
                <div class="student-profile-panel__detail-card">
                  <span class="student-profile-panel__detail-label">Documento</span>
                  <span class="student-profile-panel__detail-value">{{ student.document || 'Sin documento' }}</span>
                </div>
                <div class="student-profile-panel__detail-card">
                  <span class="student-profile-panel__detail-label">Estado institucional</span>
                  <span class="student-profile-panel__detail-value">{{ institutionalStatusLabel }}</span>
                </div>
                <div class="student-profile-panel__detail-card">
                  <span class="student-profile-panel__detail-label">Aula actual</span>
                  <span class="student-profile-panel__detail-value">{{ classroomLabel }}</span>
                </div>
                <div class="student-profile-panel__detail-card">
                  <span class="student-profile-panel__detail-label">Año lectivo</span>
                  <span class="student-profile-panel__detail-value">{{ student.schoolYear ?? 'Sin asignación' }}</span>
                </div>
                <div class="student-profile-panel__detail-card">
                  <span class="student-profile-panel__detail-label">Turno</span>
                  <span class="student-profile-panel__detail-value">{{ shiftLabel }}</span>
                </div>
                <div class="student-profile-panel__detail-card">
                  <span class="student-profile-panel__detail-label">Hoy</span>
                  <span class="student-profile-panel__detail-value">{{ formattedTodayDate }}</span>
                </div>
              </div>
            </section>

            <section
              v-if="showContacts"
              class="student-profile-panel__section student-profile-panel__section--contacts"
            >
              <div class="ui-eyebrow">Contactos familiares</div>
              <div class="text-subtitle2 text-weight-bold q-mt-sm">
                Referencias asociadas al estudiante
              </div>

              <div
                v-if="student.contacts.length === 0"
                class="student-profile-panel__empty text-body2 text-grey-7 q-pt-md"
              >
                <q-icon name="groups" size="24px" color="grey-6" />
                <div class="text-subtitle2 text-weight-bold text-grey-8">
                  Sin contactos registrados
                </div>
                <p class="q-mb-none">
                  No hay referencias familiares asociadas a este estudiante.
                </p>
              </div>

              <div v-else class="student-contacts-list q-mt-md">
                <article
                  v-for="contact in student.contacts"
                  :key="contact.id"
                  class="student-contact-card"
                >
                  <div class="student-contact-card__header">
                    <div>
                      <div class="student-contact-card__name">{{ contact.fullName }}</div>
                      <div class="student-contact-card__relationship">{{ contact.relationship }}</div>
                    </div>
                    <div class="row q-gutter-xs">
                      <q-chip
                        v-if="contact.isPrimary"
                        dense
                        class="ui-stat-chip"
                        color="red-1"
                        text-color="red-10"
                        icon="star"
                      >
                        Principal
                      </q-chip>
                      <q-chip
                        v-if="contact.isEmergencyContact"
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

                  <div class="student-contact-card__details">
                    <div class="student-contact-card__item">
                      <span class="student-contact-card__label">Teléfono principal</span>
                      <span class="student-contact-card__value">{{ contact.phonePrimary }}</span>
                    </div>
                    <div v-if="contact.phoneSecondary" class="student-contact-card__item">
                      <span class="student-contact-card__label">Teléfono alterno</span>
                      <span class="student-contact-card__value">{{ contact.phoneSecondary }}</span>
                    </div>
                    <div v-if="contact.address" class="student-contact-card__item student-contact-card__item--wide">
                      <span class="student-contact-card__label">Dirección</span>
                      <span class="student-contact-card__value">{{ contact.address }}</span>
                    </div>
                    <div v-if="contact.notes" class="student-contact-card__item student-contact-card__item--wide">
                      <span class="student-contact-card__label">Observación</span>
                      <span class="student-contact-card__value">{{ contact.notes }}</span>
                    </div>
                  </div>
                </article>
              </div>
            </section>

            <section class="student-profile-panel__section student-profile-panel__section--alerts">
              <div class="ui-eyebrow">Alertas relacionadas</div>
              <div class="text-subtitle2 text-weight-bold q-mt-sm">
                Riesgos o patrones detectados
              </div>

              <div
                v-if="student.alerts.length === 0"
                class="student-profile-panel__empty text-body2 text-grey-7 q-pt-md"
              >
                No hay alertas activas para este estudiante.
              </div>

              <q-list
                v-else
                bordered
                separator
                class="rounded-borders q-mt-md student-profile-alerts"
              >
                <q-item v-for="alert in student.alerts" :key="`${alert.alertType}-${alert.studentId}`">
                  <q-item-section avatar top>
                    <q-chip
                      square
                      dense
                      :color="getAttendanceAlertTone(alert.alertType).color"
                      :text-color="getAttendanceAlertTone(alert.alertType).textColor"
                      :icon="getAttendanceAlertTone(alert.alertType).icon"
                    >
                      {{ getAttendanceAlertLabel(alert.alertType) }}
                    </q-chip>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">{{ alert.title }}</q-item-label>
                    <q-item-label class="q-mt-sm text-body2">
                      {{ alert.description }}
                    </q-item-label>
                    <div class="alert-date-row q-mt-sm">
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
                  </q-item-section>
                </q-item>
              </q-list>
            </section>

            <section
              v-if="isStudentInstitutionalLayout"
              class="student-profile-panel__section student-profile-panel__section--attendance"
            >
              <div class="ui-eyebrow">Resumen institucional</div>
              <div class="text-subtitle2 text-weight-bold q-mt-sm">
                Asistencia reciente y estado diario
              </div>

              <div class="student-profile-panel__attendance-grid q-mt-lg">
                <div class="student-profile-panel__attendance-item">
                  <span class="student-profile-panel__attendance-label">Estado de hoy</span>
                  <span class="student-profile-panel__attendance-value">
                    {{ student.todayStatus.operationalStatus }}
                  </span>
                </div>
                <div class="student-profile-panel__attendance-item">
                  <span class="student-profile-panel__attendance-label">Asistencia reciente</span>
                  <span class="student-profile-panel__attendance-value">
                    {{ student.recentSummary.attendancePercentage.toFixed(1) }} %
                  </span>
                </div>
                <div class="student-profile-panel__attendance-item">
                  <span class="student-profile-panel__attendance-label">Entradas / salidas</span>
                  <span class="student-profile-panel__attendance-value">
                    {{ student.recentSummary.entriesRegistered }} / {{ student.recentSummary.exitsRegistered }}
                  </span>
                </div>
                <div class="student-profile-panel__attendance-item">
                  <span class="student-profile-panel__attendance-label">Ausencias</span>
                  <span class="student-profile-panel__attendance-value">
                    {{ student.recentSummary.absences }}
                  </span>
                </div>
              </div>

              <div class="student-profile-panel__today-strip q-mt-lg">
                <div class="student-profile-panel__today-item">
                  <span class="student-profile-panel__attendance-label">Fecha</span>
                  <span class="student-profile-panel__attendance-caption">{{ formattedTodayDate }}</span>
                </div>
                <div class="student-profile-panel__today-item">
                  <span class="student-profile-panel__attendance-label">Entrada</span>
                  <span class="student-profile-panel__attendance-caption">
                    {{ student.todayStatus.entry ? formatMarkedTime(student.todayStatus.entry.markedAt) : 'Pendiente' }}
                  </span>
                </div>
                <div class="student-profile-panel__today-item">
                  <span class="student-profile-panel__attendance-label">Salida</span>
                  <span class="student-profile-panel__attendance-caption">
                    {{ student.todayStatus.exit ? formatMarkedTime(student.todayStatus.exit.markedAt) : 'Pendiente' }}
                  </span>
                </div>
              </div>
            </section>

            <section
              v-if="showRecentActivity"
              class="student-profile-panel__section"
            >
              <div class="ui-eyebrow">Actividad reciente</div>
              <div class="text-subtitle2 text-weight-bold q-mt-sm">
                Últimos registros del estudiante
              </div>

              <div
                v-if="student.recentItems.length === 0"
                class="student-profile-panel__empty text-body2 text-grey-7 q-pt-md"
              >
                No hay registros recientes para mostrar.
              </div>

              <div v-else class="history-results q-mt-md">
                <article
                  v-for="item in student.recentItems"
                  :key="`${item.itemType}-${item.attendanceDate}-${item.markedAt ?? item.status}`"
                  class="history-entry"
                >
                  <div
                    class="history-entry__icon flex flex-center"
                    :class="item.itemType === 'absence' ? 'bg-red-1 text-red-10' : 'bg-grey-2 text-grey-9'"
                  >
                    <q-icon
                      :name="item.itemType === 'absence' ? 'event_busy' : item.markType === 'entry' ? 'login' : 'logout'"
                      size="22px"
                    />
                  </div>
                  <div>
                    <div class="history-entry__title">
                      {{ getRecentItemTitle(item) }}
                    </div>
                    <div class="history-entry__meta">
                      {{ formatItemDate(item.attendanceDate) }}
                      <span v-if="item.markedAt"> - {{ formatMarkedTime(item.markedAt) }}</span>
                    </div>
                    <div v-if="item.observation" class="history-entry__note">
                      {{ item.observation }}
                    </div>
                  </div>
                  <div class="history-entry__aside">
                    <q-chip
                      v-if="item.itemType === 'absence'"
                      dense
                      :color="getAttendanceDayStatusTone(item.status as AttendanceDayStatusType).color"
                      :text-color="getAttendanceDayStatusTone(item.status as AttendanceDayStatusType).textColor"
                    >
                      {{ getAttendanceDayStatusLabel(item.status as AttendanceDayStatusType) }}
                    </q-chip>
                    <template v-else>
                      <q-chip
                        dense
                        :color="getAttendanceRecordStatusTone(item.status as AttendanceRecordStatus).color"
                        :text-color="getAttendanceRecordStatusTone(item.status as AttendanceRecordStatus).textColor"
                      >
                        {{ getAttendanceRecordStatusLabel(item.status as AttendanceRecordStatus) }}
                      </q-chip>
                      <q-chip
                        v-if="item.source"
                        dense
                        color="grey-2"
                        text-color="grey-8"
                      >
                        {{ item.source === 'qr' ? 'QR' : 'Manual' }}
                      </q-chip>
                    </template>
                  </div>
                </article>
              </div>
            </section>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import StudentQrCredentialCard from 'components/student/StudentQrCredentialCard.vue';
import StatSummaryCard from 'components/ui/StatSummaryCard.vue';
import type {
  AttendanceDayStatusType,
  AttendanceHistoryItem,
  AttendanceRecordStatus,
} from 'src/types/attendance';
import type { UserRole } from 'src/types/session';
import type { StudentDetail } from 'src/types/students';
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

const props = withDefaults(
  defineProps<{
    student: StudentDetail;
    viewerRole?: UserRole;
    showCredential?: boolean;
    showContacts?: boolean;
    showRecentActivity?: boolean;
  }>(),
  {
    viewerRole: 'director',
    showCredential: true,
    showContacts: true,
    showRecentActivity: true,
  },
);

const isStudentInstitutionalLayout = computed(
  () => props.viewerRole === 'student' && !props.showCredential,
);

const classroomLabel = computed(() => {
  if (
    props.student.grade === null ||
    !props.student.section ||
    !props.student.shift
  ) {
    return 'Sin asignación vigente';
  }

  return `${props.student.grade} ${props.student.section} - ${
    props.student.shift === 'morning' ? 'Turno mañana' : 'Turno tarde'
  }`;
});

const shiftLabel = computed(() => {
  if (!props.student.shift) {
    return 'Sin turno vigente';
  }

  return props.student.shift === 'morning' ? 'Turno mañana' : 'Turno tarde';
});

const formattedTodayDate = computed(() =>
  new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeZone: 'America/Lima',
  }).format(new Date(`${props.student.todayStatus.attendanceDate}T00:00:00`)),
);

const headerEyebrow = computed(() => {
  if (props.viewerRole === 'student') {
    return 'Mi ficha';
  }

  if (props.viewerRole === 'auxiliary') {
    return 'Ficha operativa';
  }

  return 'Ficha institucional';
});

const headerTitle = computed(() => {
  if (props.viewerRole === 'student') {
    return 'Identidad, matrícula y contactos familiares';
  }

  if (props.viewerRole === 'auxiliary') {
    return 'Consulta rápida para operación y verificación diaria';
  }

  return 'Identidad, matrícula, contactos y señales de seguimiento';
});

const headerDescription = computed(() => {
  if (props.viewerRole === 'student') {
    return 'Consulta tu información institucional actual y verifica tus contactos registrados sin salir de tu área personal.';
  }

  if (props.viewerRole === 'auxiliary') {
    return 'Vista limitada para confirmar identidad, matrícula vigente, contactos útiles y alertas recientes.';
  }

  return 'Vista institucional consolidada para soporte administrativo, seguimiento y revisión del estudiante.';
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

  return 'Activo';
});

const institutionalStatusTone = computed(() => {
  if (props.student.institutionalStatus === 'active') {
    return { color: 'green-1', textColor: 'green-10' };
  }

  if (props.student.institutionalStatus === 'inactive') {
    return { color: 'grey-3', textColor: 'grey-8' };
  }

  if (props.student.institutionalStatus === 'withdrawn') {
    return { color: 'orange-1', textColor: 'orange-10' };
  }

  if (props.student.institutionalStatus === 'transferred') {
    return { color: 'blue-1', textColor: 'blue-10' };
  }

  return { color: 'grey-2', textColor: 'grey-9' };
});

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
</script>
