<template>
  <div class="student-institutional-profile">
    <q-card flat bordered class="history-card student-institutional-profile__card">
      <q-card-section class="ui-card-body student-institutional-profile__header-card">
        <div class="ui-eyebrow">Mi ficha</div>
        <div class="student-institutional-profile__header-top">
          <div class="student-institutional-profile__header-copy">
            <div class="text-subtitle1 text-weight-bold">
              Identidad, matrícula y contactos familiares
            </div>
            <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
              Revisa tu información institucional actual y verifica tus datos de referencia sin
              salir de tu área personal.
            </p>
          </div>
        </div>

        <div class="student-institutional-profile__chip-row">
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
            {{ schoolYearLabel }}
          </q-chip>
        </div>

        <div class="student-institutional-profile__summary-strip">
          <div class="student-institutional-profile__summary-item">
            <span class="student-institutional-profile__summary-label">Estado institucional</span>
            <span class="student-institutional-profile__summary-value">
              {{ institutionalStatusLabel }}
            </span>
          </div>
          <div class="student-institutional-profile__summary-item">
            <span class="student-institutional-profile__summary-label">Situación actual</span>
            <span class="student-institutional-profile__summary-value">{{ situationLabel }}</span>
          </div>
          <div class="student-institutional-profile__summary-item">
            <span class="student-institutional-profile__summary-label">Aula actual</span>
            <span class="student-institutional-profile__summary-value">{{ classroomLabel }}</span>
          </div>
          <div class="student-institutional-profile__summary-item">
            <span class="student-institutional-profile__summary-label">Turno</span>
            <span class="student-institutional-profile__summary-value">{{ shiftLabel }}</span>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <div class="student-institutional-profile__main-grid">
      <q-card flat bordered class="history-card student-institutional-profile__card">
        <q-card-section class="ui-card-body student-institutional-profile__identity-card">
          <div class="ui-eyebrow">Identidad y matrícula</div>
          <div class="student-institutional-profile__identity-hero">
            <div>
              <div class="student-institutional-profile__name">{{ student.fullName }}</div>
              <div class="student-institutional-profile__caption">
                Matrícula actual registrada para el estudiante.
              </div>
            </div>
            <q-chip
              class="ui-stat-chip"
              :color="institutionalStatusTone.color"
              :text-color="institutionalStatusTone.textColor"
              icon="fact_check"
            >
              {{ institutionalStatusLabel }}
            </q-chip>
          </div>

          <div class="student-institutional-profile__identity-grid">
            <div class="student-institutional-profile__field">
              <span class="student-institutional-profile__field-label">Código</span>
              <span class="student-institutional-profile__field-value">{{ student.code }}</span>
            </div>
            <div class="student-institutional-profile__field">
              <span class="student-institutional-profile__field-label">Documento</span>
              <span class="student-institutional-profile__field-value">
                {{ student.document || 'Sin documento registrado' }}
              </span>
            </div>
            <div class="student-institutional-profile__field">
              <span class="student-institutional-profile__field-label">Situación actual</span>
              <span class="student-institutional-profile__field-value">
                {{ situationLabel }}
              </span>
            </div>
            <div class="student-institutional-profile__field">
              <span class="student-institutional-profile__field-label">Detalle administrativo</span>
              <span class="student-institutional-profile__field-value">
                {{ student.currentSituation?.administrativeDetail || 'Sin detalle registrado' }}
              </span>
            </div>
            <div class="student-institutional-profile__field">
              <span class="student-institutional-profile__field-label">Aula actual</span>
              <span class="student-institutional-profile__field-value">{{ classroomLabel }}</span>
            </div>
            <div class="student-institutional-profile__field">
              <span class="student-institutional-profile__field-label">Turno</span>
              <span class="student-institutional-profile__field-value">{{ shiftLabel }}</span>
            </div>
            <div class="student-institutional-profile__field">
              <span class="student-institutional-profile__field-label">Año lectivo</span>
              <span class="student-institutional-profile__field-value">{{ schoolYearLabel }}</span>
            </div>
            <div class="student-institutional-profile__field">
              <span class="student-institutional-profile__field-label">Hoy</span>
              <span class="student-institutional-profile__field-value">{{ formattedTodayDate }}</span>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <q-card flat bordered class="history-card student-institutional-profile__card">
        <q-card-section class="ui-card-body student-institutional-profile__contacts-card">
          <div class="ui-eyebrow">Contactos familiares</div>
          <div class="text-subtitle2 text-weight-bold q-mt-sm">
            Referencias asociadas al estudiante
          </div>

          <div
            v-if="student.contacts.length === 0"
            class="student-institutional-profile__empty-state"
          >
            <q-icon name="groups" size="28px" color="grey-6" />
            <div class="text-subtitle2 text-weight-bold text-grey-8">
              Sin contactos registrados
            </div>
            <p class="text-body2 text-grey-7 q-mb-none">
              Aún no hay referencias familiares asociadas a tu ficha institucional.
            </p>
          </div>

          <div v-else class="student-institutional-profile__contacts-list">
            <article
              v-for="contact in student.contacts"
              :key="contact.id"
              class="student-institutional-profile__contact"
            >
              <div class="student-institutional-profile__contact-top">
                <div>
                  <div class="student-institutional-profile__contact-name">
                    {{ contact.fullName }}
                  </div>
                  <div class="student-institutional-profile__contact-meta">
                    {{ contact.relationship }}
                  </div>
                </div>

                <div class="student-institutional-profile__contact-chips">
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

              <div class="student-institutional-profile__contact-body">
                <div class="student-institutional-profile__contact-row">
                  <span class="student-institutional-profile__contact-label">Teléfono principal</span>
                  <span class="student-institutional-profile__contact-value">
                    {{ contact.phonePrimary }}
                  </span>
                </div>
                <div
                  v-if="contact.phoneSecondary"
                  class="student-institutional-profile__contact-row"
                >
                  <span class="student-institutional-profile__contact-label">Teléfono alterno</span>
                  <span class="student-institutional-profile__contact-value">
                    {{ contact.phoneSecondary }}
                  </span>
                </div>
                <div v-if="contact.email" class="student-institutional-profile__contact-row">
                  <span class="student-institutional-profile__contact-label">Correo</span>
                  <span class="student-institutional-profile__contact-value">
                    {{ contact.email }}
                  </span>
                </div>
                <div
                  v-if="contact.isAuthorizedToCoordinate || contact.isAuthorizedToPickUp"
                  class="student-institutional-profile__contact-row"
                >
                  <span class="student-institutional-profile__contact-label">Autorizaciones</span>
                  <span class="student-institutional-profile__contact-value">
                    {{ getAuthorizationLabel(contact) }}
                  </span>
                </div>
                <div v-if="contact.address" class="student-institutional-profile__contact-row">
                  <span class="student-institutional-profile__contact-label">Dirección</span>
                  <span class="student-institutional-profile__contact-value">
                    {{ contact.address }}
                  </span>
                </div>
                <div v-if="contact.notes" class="student-institutional-profile__contact-row">
                  <span class="student-institutional-profile__contact-label">Observación</span>
                  <span class="student-institutional-profile__contact-value">
                    {{ contact.notes }}
                  </span>
                </div>
              </div>
            </article>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <q-card flat bordered class="history-card student-institutional-profile__card">
      <q-card-section class="ui-card-body student-institutional-profile__support-card">
        <div class="ui-eyebrow">Resumen institucional</div>
        <div class="text-subtitle2 text-weight-bold q-mt-sm">
          Asistencia reciente y alertas asociadas
        </div>

        <div class="student-institutional-profile__support-grid">
          <section class="student-institutional-profile__support-section">
            <div class="student-institutional-profile__support-title">
              Resumen de asistencia
            </div>

            <div class="student-institutional-profile__attendance-grid">
              <div class="student-institutional-profile__attendance-item">
                <span class="student-institutional-profile__field-label">Estado de hoy</span>
                <span class="student-institutional-profile__field-value">
                  {{ student.todayStatus.operationalStatus }}
                </span>
              </div>
              <div class="student-institutional-profile__attendance-item">
                <span class="student-institutional-profile__field-label">Asistencia reciente</span>
                <span class="student-institutional-profile__field-value">
                  {{ student.recentSummary.attendancePercentage.toFixed(1) }} %
                </span>
              </div>
              <div class="student-institutional-profile__attendance-item">
                <span class="student-institutional-profile__field-label">Entradas / salidas</span>
                <span class="student-institutional-profile__field-value">
                  {{ student.recentSummary.entriesRegistered }} / {{ student.recentSummary.exitsRegistered }}
                </span>
              </div>
              <div class="student-institutional-profile__attendance-item">
                <span class="student-institutional-profile__field-label">Ausencias</span>
                <span class="student-institutional-profile__field-value">
                  {{ student.recentSummary.absences }}
                </span>
              </div>
            </div>

            <div class="student-institutional-profile__today-grid">
              <div class="student-institutional-profile__today-item">
                <span class="student-institutional-profile__field-label">Fecha</span>
                <span class="student-institutional-profile__contact-value">
                  {{ formattedTodayDate }}
                </span>
              </div>
              <div class="student-institutional-profile__today-item">
                <span class="student-institutional-profile__field-label">Entrada</span>
                <span class="student-institutional-profile__contact-value">
                  {{ student.todayStatus.entry ? formatMarkedTime(student.todayStatus.entry.markedAt) : 'Pendiente' }}
                </span>
              </div>
              <div class="student-institutional-profile__today-item">
                <span class="student-institutional-profile__field-label">Salida</span>
                <span class="student-institutional-profile__contact-value">
                  {{ student.todayStatus.exit ? formatMarkedTime(student.todayStatus.exit.markedAt) : 'Pendiente' }}
                </span>
              </div>
            </div>
          </section>

          <section class="student-institutional-profile__support-section">
            <div class="student-institutional-profile__support-title">
              Alertas relacionadas
            </div>

            <div
              v-if="student.alerts.length === 0"
              class="student-institutional-profile__empty-state student-institutional-profile__empty-state--compact"
            >
              <q-icon name="verified" size="24px" color="green-6" />
              <div class="text-subtitle2 text-weight-bold text-grey-8">
                Sin alertas activas
              </div>
              <p class="text-body2 text-grey-7 q-mb-none">
                No hay patrones de asistencia que requieran atención por ahora.
              </p>
            </div>

            <div v-else class="student-institutional-profile__alerts-list">
              <article
                v-for="alert in student.alerts"
                :key="`${alert.alertType}-${alert.studentId}`"
                class="student-institutional-profile__alert"
              >
                <div class="student-institutional-profile__alert-header">
                  <q-chip
                    square
                    dense
                    :color="getAttendanceAlertTone(alert.alertType).color"
                    :text-color="getAttendanceAlertTone(alert.alertType).textColor"
                    :icon="getAttendanceAlertTone(alert.alertType).icon"
                  >
                    {{ getAttendanceAlertLabel(alert.alertType) }}
                  </q-chip>
                  <div class="student-institutional-profile__alert-title">
                    {{ alert.title }}
                  </div>
                </div>
                <p class="text-body2 text-grey-7 q-mt-sm q-mb-none">
                  {{ alert.description }}
                </p>
                <div class="student-institutional-profile__alert-dates">
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
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { StudentContact, StudentDetail } from 'src/types/students';
import {
  getAttendanceAlertLabel,
  getAttendanceAlertTone,
} from 'src/utils/attendance-alerts';

const props = defineProps<{
  student: StudentDetail;
}>();

const classroomLabel = computed(() => {
  if (
    props.student.grade === null ||
    !props.student.section ||
    !props.student.shift
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

const schoolYearLabel = computed(() =>
  props.student.schoolYear ? String(props.student.schoolYear) : 'Sin asignación',
);

const formattedTodayDate = computed(() =>
  new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeZone: 'America/Lima',
  }).format(new Date(`${props.student.todayStatus.attendanceDate}T00:00:00`)),
);

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

const situationLabel = computed(() => {
  if (!props.student.currentSituation) {
    return 'Sin registrar';
  }

  return `${institutionalStatusLabel.value} · ${getMovementLabel(props.student.currentSituation.movementType)}`;
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

  if (props.student.institutionalStatus === 'observed') {
    return { color: 'amber-1', textColor: 'amber-10' };
  }

  return { color: 'grey-2', textColor: 'grey-9' };
});

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

function formatAlertDate(date: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
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

function getAuthorizationLabel(contact: StudentContact): string {
  const labels: string[] = [];

  if (contact.isAuthorizedToCoordinate) {
    labels.push('Coordinar');
  }

  if (contact.isAuthorizedToPickUp) {
    labels.push('Recoger');
  }

  return labels.join(' · ');
}
</script>
