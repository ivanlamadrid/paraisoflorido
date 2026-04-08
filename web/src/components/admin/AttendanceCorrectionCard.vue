<template>
  <q-card flat bordered class="admin-card">
    <q-card-section class="ui-card-body">
      <div class="row items-start justify-between q-col-gutter-lg">
        <div class="col-12 col-lg">
          <div class="ui-eyebrow">Corrección de asistencia</div>
          <div class="text-subtitle1 text-weight-bold q-mt-sm">
            Ajuste controlado de entrada o salida
          </div>
          <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
            Solo dirección y secretaría pueden corregir una marca ya registrada.
            Cada cambio exige motivo y queda auditado sin borrar el historial.
          </p>
        </div>
        <div class="col-12 col-lg-auto">
          <q-chip class="ui-stat-chip" color="red-1" text-color="red-10" icon="history">
            Auditoría permanente
          </q-chip>
        </div>
      </div>

      <q-form class="context-grid context-grid--attendance q-mt-lg" @submit="handleLoadDailyView">
        <q-input
          v-model="context.attendanceDate"
          type="date"
          label="Fecha"
          outlined
          :rules="[(value) => Boolean(value) || 'Selecciona la fecha']"
        >
          <template #prepend>
            <q-icon name="event" />
          </template>
        </q-input>

        <q-input
          v-model.number="context.schoolYear"
          type="number"
              label="Año escolar"
          outlined
          min="2000"
          max="2100"
        >
          <template #prepend>
            <q-icon name="calendar_month" />
          </template>
        </q-input>

        <q-select
          v-model="context.grade"
          label="Grado"
          outlined
          emit-value
          map-options
          :options="gradeOptions"
          @update:model-value="handleGradeChange"
        >
          <template #prepend>
            <q-icon name="school" />
          </template>
        </q-select>

        <q-select
          v-model="context.section"
              label="Sección"
          outlined
          emit-value
          map-options
          :options="sectionOptions"
        >
          <template #prepend>
            <q-icon name="groups" />
          </template>
        </q-select>

        <q-select
          v-model="context.shift"
          label="Turno"
          outlined
          emit-value
          map-options
          :options="shiftOptions"
        >
          <template #prepend>
                    <q-icon name="schedule" />
                  </template>
                </q-select>

        <div class="context-grid__actions context-grid__actions--attendance">
          <div class="context-grid__helper text-caption text-grey-7">
            Ajusta el contexto y carga el aula para corregir una marca existente.
          </div>
          <div class="context-grid__button-group">
            <q-btn
              color="primary"
              label="Cargar asistencia diaria"
              no-caps
              type="submit"
              :loading="isLoadingDaily"
            />
            <q-btn
              outline
              color="primary"
              icon="download"
              label="Exportar CSV"
              no-caps
              :loading="exportingFormat === 'csv'"
              :disable="isLoadingDaily"
              @click="handleExportAttendance('csv')"
            />
            <q-btn
              outline
              color="secondary"
              icon="table_view"
              label="Exportar Excel"
              no-caps
              :loading="exportingFormat === 'xlsx'"
              :disable="isLoadingDaily"
              @click="handleExportAttendance('xlsx')"
            />
          </div>
        </div>
      </q-form>

      <StatusBanner
        v-if="feedback"
        class="q-mt-lg"
        :variant="feedback.type"
        :title="feedback.title"
        :message="feedback.message"
      />

      <div v-if="dailySummary.totalStudents > 0" class="row q-col-gutter-sm q-mt-lg">
        <div class="col-12 col-sm-6 col-lg-3">
          <q-chip class="ui-stat-chip full-width justify-center" color="grey-2" text-color="grey-9" icon="groups">
            {{ dailySummary.totalStudents }} en el aula
          </q-chip>
        </div>
        <div class="col-12 col-sm-6 col-lg-3">
          <q-chip class="ui-stat-chip full-width justify-center" color="blue-1" text-color="blue-10" icon="schedule">
            {{ dailySummary.pendingEntries }} entradas pendientes
          </q-chip>
        </div>
        <div class="col-12 col-sm-6 col-lg-3">
          <q-chip class="ui-stat-chip full-width justify-center" color="orange-1" text-color="orange-10" icon="logout">
            {{ dailySummary.pendingExits }} salidas pendientes
          </q-chip>
        </div>
        <div class="col-12 col-sm-6 col-lg-3">
          <q-chip class="ui-stat-chip full-width justify-center" color="red-1" text-color="red-10" icon="event_busy">
            {{ dailySummary.absences }} ausencias
          </q-chip>
        </div>
      </div>

      <div v-if="isLoadingDaily" class="column items-center q-py-xl q-gutter-md">
        <q-spinner color="primary" size="34px" />
        <span class="text-body2 text-grey-7">Cargando marcas del aula...</span>
      </div>

      <div v-else-if="dailyItems.length === 0" class="text-center q-py-xl text-grey-7">
        Carga el aula para revisar entradas y salidas registradas.
      </div>

      <div v-else class="table-wrap q-mt-lg">
        <q-markup-table flat separator="cell">
          <thead>
            <tr>
                  <th class="text-left">Código</th>
              <th class="text-left">Estudiante</th>
              <th class="text-left">Estado diario</th>
              <th class="text-left">Entrada</th>
              <th class="text-left">Salida</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in dailyItems" :key="item.studentId">
              <td>{{ item.code }}</td>
              <td>
                <div class="text-weight-medium">{{ item.fullName }}</div>
                <div class="text-caption text-grey-7">
                  {{ item.isActive ? 'Activo' : 'Inactivo' }}
                </div>
              </td>
              <td>
                <div class="attendance-correction-cell">
                  <q-chip
                    v-if="item.absence"
                    dense
                    square
                    :color="getAttendanceDayStatusTone(item.absence.statusType).color"
                    :text-color="getAttendanceDayStatusTone(item.absence.statusType).textColor"
                  >
                    {{ getAttendanceDayStatusLabel(item.absence.statusType) }}
                  </q-chip>
                  <div v-if="item.absence?.observation" class="attendance-mark-badge__note">
                    {{ item.absence.observation }}
                  </div>
                  <q-btn
                    v-if="item.absence"
                    flat
                    color="secondary"
                    icon="close"
                    label="Quitar ausencia"
                    no-caps
                    class="support-action-btn"
                    :loading="resolvingDayStatusId === item.absence.id"
                    @click="handleResolveDayStatus(item.absence.id)"
                  />
                  <template v-else>
                    <span class="attendance-mark-badge__empty">Sin ausencia registrada</span>
                    <div class="row q-col-gutter-sm">
                      <div class="col-12">
                        <q-btn
                          flat
                          color="primary"
                          icon="verified_user"
                          label="Ausencia just."
                          no-caps
                          class="support-action-btn"
                          :disable="Boolean(item.entry) || Boolean(item.exit) || !item.isActive"
                          @click="openDayStatusDialog(item, 'justified_absence')"
                        />
                      </div>
                      <div class="col-12">
                        <q-btn
                          flat
                          color="negative"
                          icon="event_busy"
                          label="Ausencia no just."
                          no-caps
                          class="support-action-btn"
                          :disable="Boolean(item.entry) || Boolean(item.exit) || !item.isActive"
                          @click="openDayStatusDialog(item, 'unjustified_absence')"
                        />
                      </div>
                    </div>
                  </template>
                </div>
              </td>
              <td>
                <div class="attendance-correction-cell">
                  <AttendanceMarkBadge :mark="item.entry" empty-label="Sin entrada" />
                  <q-btn
                    v-if="item.entry"
                    flat
                    color="primary"
                    icon="edit"
                    label="Corregir entrada"
                    no-caps
                    class="support-action-btn"
                    @click="openCorrectionDialog(item, 'entry')"
                  />
                </div>
              </td>
              <td>
                <div class="attendance-correction-cell">
                  <AttendanceMarkBadge :mark="item.exit" empty-label="Sin salida" />
                  <q-btn
                    v-if="item.exit"
                    flat
                    color="primary"
                    icon="edit"
                    label="Corregir salida"
                    no-caps
                    class="support-action-btn"
                    @click="openCorrectionDialog(item, 'exit')"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </q-markup-table>
      </div>
    </q-card-section>
  </q-card>

  <q-dialog v-model="isDialogOpen">
    <q-card class="admin-card correction-dialog-card">
      <q-card-section class="ui-card-body">
        <div class="row items-start justify-between q-col-gutter-md">
          <div class="col-12 col-md">
              <div class="ui-eyebrow">Corrección controlada</div>
            <div class="text-subtitle1 text-weight-bold q-mt-sm">
              {{ dialogTitle }}
            </div>
            <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
              Corrige la hora u observacion de la marca seleccionada. El motivo es obligatorio y el
              historial de cambios queda guardado.
            </p>
          </div>
          <div class="col-12 col-md-auto">
            <q-btn flat round dense icon="close" @click="closeDialog" />
          </div>
        </div>

        <div v-if="selectedCorrectionTarget" class="correction-dialog-summary q-mt-lg">
          <div class="context-summary__item">
            <span class="context-summary__label">Estudiante</span>
            <span class="context-summary__value">
              {{ selectedCorrectionTarget.fullName }}
            </span>
          </div>
          <div class="context-summary__item">
                <span class="context-summary__label">Código</span>
            <span class="context-summary__value">
              {{ selectedCorrectionTarget.code }}
            </span>
          </div>
          <div class="context-summary__item">
            <span class="context-summary__label">Marca actual</span>
            <span class="context-summary__value">
              {{ selectedCorrectionTarget.markType === 'entry' ? 'Entrada' : 'Salida' }} -
              {{ formatMarkedTime(selectedCorrectionTarget.mark.markedAt) }}
            </span>
          </div>
        </div>

        <StatusBanner
          v-if="dialogFeedback"
          class="q-mt-lg"
          :variant="dialogFeedback.type"
          :title="dialogFeedback.title"
          :message="dialogFeedback.message"
        />

        <q-form class="q-gutter-md q-mt-lg" @submit="handleSubmitCorrection">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-4">
              <q-input
                v-model="correctionForm.markedTime"
                type="time"
                label="Hora corregida"
                outlined
                :rules="[(value) => Boolean(value) || 'Ingresa la hora corregida']"
              >
                <template #prepend>
                  <q-icon name="schedule" />
                </template>
              </q-input>
            </div>
            <div class="col-12 col-md-4">
              <q-select
                v-model="correctionForm.status"
                label="Estado de la marca"
                outlined
                emit-value
                map-options
                :options="correctionStatusOptions"
              >
                <template #prepend>
                  <q-icon name="fact_check" />
                </template>
              </q-select>
            </div>
            <div class="col-12 col-md-4">
              <q-input
                v-model="correctionForm.observation"
                label="Observacion"
                outlined
                maxlength="255"
              >
                <template #prepend>
                  <q-icon name="edit_note" />
                </template>
              </q-input>
            </div>
          </div>

          <q-input
            v-model="correctionForm.reason"
            type="textarea"
            autogrow
              label="Motivo de la corrección"
            outlined
            maxlength="255"
              :rules="[(value) => Boolean(value?.trim()) || 'Ingresa el motivo de la corrección']"
          >
            <template #prepend>
              <q-icon name="fact_check" />
            </template>
          </q-input>

          <div class="row items-center justify-between q-gutter-sm">
            <div class="text-caption text-grey-7">
            El registro original no se elimina; la corrección queda agregada al historial.
            </div>
            <div class="correction-action-group">
              <q-btn flat color="grey-8" label="Cerrar" no-caps @click="closeDialog" />
              <q-btn
                color="primary"
            label="Guardar corrección"
                no-caps
                type="submit"
                :loading="isSavingCorrection"
              />
            </div>
          </div>
        </q-form>

        <q-separator class="q-my-lg" />

        <div class="ui-eyebrow">Historial de correcciones</div>
        <div class="text-subtitle2 text-weight-bold q-mt-sm">
          Cambios previos de esta marca
        </div>

        <div v-if="isLoadingHistory" class="column items-center q-py-lg q-gutter-md">
          <q-spinner color="primary" size="28px" />
          <span class="text-body2 text-grey-7">Cargando historial...</span>
        </div>

        <div v-else-if="correctionHistory.length === 0" class="text-body2 text-grey-7 q-pt-md">
                Esta marca todavía no tiene correcciones registradas.
        </div>

        <q-list v-else bordered separator class="rounded-borders q-mt-md correction-history-list">
          <q-item v-for="item in correctionHistory" :key="item.id" class="q-py-md">
            <q-item-section>
              <q-item-label class="text-weight-medium">
                {{ formatCorrectionHeadline(item) }}
              </q-item-label>
              <q-item-label caption>
                {{ formatCorrectionSubline(item) }}
              </q-item-label>
              <q-item-label class="q-mt-sm text-body2">
                Motivo: {{ item.reason }}
              </q-item-label>
              <q-item-label class="q-mt-sm text-caption text-grey-7">
                Observacion: {{ item.previousData.observation || 'Sin observacion' }} ->
                {{ item.nextData.observation || 'Sin observacion' }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
  </q-dialog>

  <q-dialog v-model="isDayStatusDialogOpen">
    <q-card class="admin-card correction-dialog-card">
      <q-card-section class="ui-card-body">
        <div class="row items-start justify-between q-col-gutter-md">
          <div class="col-12 col-md">
            <div class="ui-eyebrow">Estado diario</div>
            <div class="text-subtitle1 text-weight-bold q-mt-sm">
              {{ dayStatusDialogTitle }}
            </div>
            <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
              Usa este estado cuando el estudiante no tenga entrada ni salida en la fecha seleccionada.
            </p>
          </div>
          <div class="col-12 col-md-auto">
            <q-btn flat round dense icon="close" @click="closeDayStatusDialog" />
          </div>
        </div>

        <StatusBanner
          v-if="dayStatusDialogFeedback"
          class="q-mt-lg"
          :variant="dayStatusDialogFeedback.type"
          :title="dayStatusDialogFeedback.title"
          :message="dayStatusDialogFeedback.message"
        />

        <div v-if="selectedDayStatusTarget" class="correction-dialog-summary q-mt-lg">
          <div class="context-summary__item">
            <span class="context-summary__label">Estudiante</span>
            <span class="context-summary__value">{{ selectedDayStatusTarget.fullName }}</span>
          </div>
          <div class="context-summary__item">
                <span class="context-summary__label">Código</span>
            <span class="context-summary__value">{{ selectedDayStatusTarget.code }}</span>
          </div>
          <div class="context-summary__item">
            <span class="context-summary__label">Fecha</span>
            <span class="context-summary__value">{{ context.attendanceDate }}</span>
          </div>
        </div>

        <q-form class="q-gutter-md q-mt-lg" @submit="handleSubmitDayStatus">
          <q-input
            v-model="dayStatusForm.observation"
            type="textarea"
            autogrow
            outlined
            maxlength="255"
            label="Observacion administrativa"
          >
            <template #prepend>
              <q-icon name="edit_note" />
            </template>
          </q-input>

          <div class="row items-center justify-between q-gutter-sm">
            <div class="text-caption text-grey-7">
            El estado diario aparecerá en la vista del aula y en el historial del estudiante.
            </div>
            <div class="correction-action-group">
              <q-btn flat color="grey-8" label="Cerrar" no-caps @click="closeDayStatusDialog" />
              <q-btn
                color="primary"
                label="Guardar estado"
                no-caps
                type="submit"
                :loading="isSavingDayStatus"
              />
            </div>
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import AttendanceMarkBadge from 'components/attendance/AttendanceMarkBadge.vue';
import StatusBanner from 'components/ui/StatusBanner.vue';
import {
  correctAttendanceRecord,
  exportAttendance,
  getAttendanceCorrectionHistory,
  getDailyAttendance,
  resolveAttendanceDayStatus,
  upsertAttendanceDayStatus,
} from 'src/services/api/attendance-api';
import { getApiErrorMessage, getApiErrorStatus } from 'src/services/api/api-errors';
import type {
  AttendanceExportFormat,
  AttendanceCorrectionLog,
  AttendanceDayStatusType,
  AttendanceMarkType,
  AttendanceRecordStatus,
  DailyAttendanceSummary,
  DailyAttendanceItem,
  DailyAttendanceMark,
  StudentShift,
} from 'src/types/attendance';
import { downloadBlobFile } from 'src/utils/download-file';
import {
  getAttendanceDayStatusLabel,
  getAttendanceDayStatusTone,
  getAttendanceRecordStatusLabel,
} from 'src/utils/attendance-status';

type FeedbackState = {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
};

type CorrectionTarget = {
  recordId: string;
  studentId: string;
  code: string;
  fullName: string;
  markType: AttendanceMarkType;
  mark: DailyAttendanceMark;
};

type DayStatusTarget = {
  studentId: string;
  code: string;
  fullName: string;
  statusType: AttendanceDayStatusType;
};

const props = defineProps<{
  activeSchoolYear: number;
  enabledTurns: StudentShift[];
  enabledGrades: number[];
  sectionsByGrade: Record<string, string[]>;
}>();

const today = new Date().toISOString().slice(0, 10);

const context = reactive({
  attendanceDate: today,
  schoolYear: props.activeSchoolYear,
  grade: props.enabledGrades[0] ?? 1,
  section: props.sectionsByGrade[String(props.enabledGrades[0] ?? 1)]?.[0] ?? 'A',
  shift: props.enabledTurns[0] ?? 'morning',
});

const dailyItems = ref<DailyAttendanceItem[]>([]);
const dailySummary = ref<DailyAttendanceSummary>({
  totalStudents: 0,
  activeStudents: 0,
  inactiveStudents: 0,
  entriesRegistered: 0,
  exitsRegistered: 0,
  lateEntries: 0,
  earlyDepartures: 0,
  justifiedAbsences: 0,
  unjustifiedAbsences: 0,
  absences: 0,
  pendingEntries: 0,
  pendingExits: 0,
  incompleteRecords: 0,
});
const correctionHistory = ref<AttendanceCorrectionLog[]>([]);
const selectedCorrectionTarget = ref<CorrectionTarget | null>(null);

const correctionForm = reactive({
  markedTime: '',
  status: 'regular' as AttendanceRecordStatus,
  observation: '',
  reason: '',
});

const dayStatusForm = reactive({
  observation: '',
});

const feedback = ref<FeedbackState | null>(null);
const dialogFeedback = ref<FeedbackState | null>(null);
const dayStatusDialogFeedback = ref<FeedbackState | null>(null);
const isLoadingDaily = ref(false);
const isDialogOpen = ref(false);
const isDayStatusDialogOpen = ref(false);
const isLoadingHistory = ref(false);
const isSavingCorrection = ref(false);
const isSavingDayStatus = ref(false);
const resolvingDayStatusId = ref<string | null>(null);
const exportingFormat = ref<AttendanceExportFormat | null>(null);
const selectedDayStatusTarget = ref<DayStatusTarget | null>(null);

const gradeOptions = computed(() =>
  props.enabledGrades.map((grade) => ({
    label: `${grade} grado`,
    value: grade,
  })),
);

const shiftOptions = computed(() =>
  props.enabledTurns.map((shift) => ({
    label: shift === 'morning' ? 'Turno mañana' : 'Turno tarde',
    value: shift,
  })),
);

const sectionOptions = computed(() =>
  (props.sectionsByGrade[String(context.grade)] ?? ['A']).map((section) => ({
    label: section,
    value: section,
  })),
);

const dialogTitle = computed(() => {
  if (!selectedCorrectionTarget.value) {
    return 'Corrección de asistencia';
  }

  return selectedCorrectionTarget.value.markType === 'entry'
    ? 'Corregir marca de entrada'
    : 'Corregir marca de salida';
});

const correctionStatusOptions = computed<
  Array<{ label: string; value: AttendanceRecordStatus }>
>(() => {
  if (selectedCorrectionTarget.value?.markType === 'entry') {
    return [
      { label: 'Regular', value: 'regular' },
      { label: 'Tardanza', value: 'late' },
    ];
  }

  return [
    { label: 'Regular', value: 'regular' },
    { label: 'Salida anticipada', value: 'early_departure' },
  ];
});

const dayStatusDialogTitle = computed(() => {
  if (!selectedDayStatusTarget.value) {
    return 'Registrar ausencia';
  }

  return getAttendanceDayStatusLabel(selectedDayStatusTarget.value.statusType);
});

function handleGradeChange(): void {
  const availableSections = props.sectionsByGrade[String(context.grade)] ?? ['A'];
  if (!availableSections.includes(context.section)) {
    context.section = availableSections[0] ?? 'A';
  }
}

function formatMarkedTime(markedAt: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Lima',
  }).format(new Date(markedAt));
}

function formatCorrectionHeadline(item: AttendanceCorrectionLog): string {
  const label = item.markType === 'entry' ? 'Entrada' : 'Salida';
  const statusSuffix =
    item.previousData.status !== item.nextData.status
      ? ` (${getAttendanceRecordStatusLabel(item.previousData.status)} -> ${getAttendanceRecordStatusLabel(item.nextData.status)})`
      : '';

  return `${label}: ${item.previousData.markedTime} -> ${item.nextData.markedTime}${statusSuffix}`;
}

function formatCorrectionSubline(item: AttendanceCorrectionLog): string {
  const correctedAtLabel = new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Lima',
  }).format(new Date(item.correctedAt));

  return `${item.correctedByDisplayName} - ${correctedAtLabel}`;
}

function createCorrectionErrorFeedback(error: unknown): FeedbackState {
  const status = getApiErrorStatus(error);
  const message = getApiErrorMessage(error);

  if (status === 404) {
    return {
      type: 'error',
      title: 'Registro no encontrado',
      message,
    };
  }

  if (status === 400) {
    return {
      type: 'warning',
      title: 'Corrección inválida',
      message,
    };
  }

  return {
    type: 'error',
      title: 'No se pudo guardar la corrección',
    message,
  };
}

async function loadDailyView(): Promise<void> {
  feedback.value = null;
  isLoadingDaily.value = true;

  try {
    const response = await getDailyAttendance({
      attendanceDate: context.attendanceDate,
      schoolYear: context.schoolYear,
      grade: context.grade,
      section: context.section,
      shift: context.shift,
    });

    dailyItems.value = response.items;
    dailySummary.value = response.summary;
  } catch (error) {
    dailyItems.value = [];
    dailySummary.value = {
      totalStudents: 0,
      activeStudents: 0,
      inactiveStudents: 0,
      entriesRegistered: 0,
      exitsRegistered: 0,
      lateEntries: 0,
      earlyDepartures: 0,
      justifiedAbsences: 0,
      unjustifiedAbsences: 0,
      absences: 0,
      pendingEntries: 0,
      pendingExits: 0,
      incompleteRecords: 0,
    };
    feedback.value = {
      type: 'error',
      title: 'No se pudo cargar la asistencia diaria',
      message: getApiErrorMessage(error),
    };
  } finally {
    isLoadingDaily.value = false;
  }
}

async function handleLoadDailyView(): Promise<void> {
  await loadDailyView();
}

async function handleExportAttendance(
  format: AttendanceExportFormat,
): Promise<void> {
  feedback.value = null;
  exportingFormat.value = format;

  try {
    const { blob, fileName } = await exportAttendance({
      attendanceDate: context.attendanceDate,
      schoolYear: context.schoolYear,
      grade: context.grade,
      section: context.section,
      shift: context.shift,
      format,
    });

    downloadBlobFile(blob, fileName);
    feedback.value = {
      type: 'success',
      title: format === 'csv' ? 'CSV listo' : 'Excel listo',
      message: `La descarga de ${fileName} comenzo correctamente para el aula cargada.`,
    };
  } catch (error) {
    feedback.value = {
      type: 'error',
      title: 'No se pudo exportar la asistencia',
      message: getApiErrorMessage(error),
    };
  } finally {
    exportingFormat.value = null;
  }
}

async function loadCorrectionHistory(recordId: string): Promise<void> {
  isLoadingHistory.value = true;

  try {
    correctionHistory.value = await getAttendanceCorrectionHistory(recordId);
  } catch (error) {
    correctionHistory.value = [];
    dialogFeedback.value = {
      type: 'error',
      title: 'No se pudo cargar el historial',
      message: getApiErrorMessage(error),
    };
  } finally {
    isLoadingHistory.value = false;
  }
}

async function openCorrectionDialog(
  item: DailyAttendanceItem,
  markType: AttendanceMarkType,
): Promise<void> {
  const mark = markType === 'entry' ? item.entry : item.exit;

  if (!mark) {
    return;
  }

  selectedCorrectionTarget.value = {
    recordId: mark.id,
    studentId: item.studentId,
    code: item.code,
    fullName: item.fullName,
    markType,
    mark,
  };
  correctionForm.markedTime = formatMarkedTime(mark.markedAt);
  correctionForm.status = mark.status;
  correctionForm.observation = mark.observation ?? '';
  correctionForm.reason = '';
  dialogFeedback.value = null;
  correctionHistory.value = [];
  isDialogOpen.value = true;
  await loadCorrectionHistory(mark.id);
}

function closeDialog(): void {
  isDialogOpen.value = false;
  dialogFeedback.value = null;
  correctionHistory.value = [];
  selectedCorrectionTarget.value = null;
}

async function handleSubmitCorrection(): Promise<void> {
  if (!selectedCorrectionTarget.value) {
    return;
  }

  const recordId = selectedCorrectionTarget.value.recordId;
  dialogFeedback.value = null;
  isSavingCorrection.value = true;

  try {
    const response = await correctAttendanceRecord(recordId, {
      markedTime: correctionForm.markedTime,
      status: correctionForm.status,
      observation: correctionForm.observation.trim() || null,
      reason: correctionForm.reason.trim(),
    });

    if (selectedCorrectionTarget.value) {
      selectedCorrectionTarget.value.mark.markedAt = response.markedAt;
      selectedCorrectionTarget.value.mark.status = response.status;
      selectedCorrectionTarget.value.mark.observation = response.observation;
    }

    feedback.value = {
      type: 'success',
      title: 'Corrección registrada',
      message: `La marca de ${response.fullName} fue corregida y quedó auditada correctamente.`,
    };

    await Promise.all([loadDailyView(), loadCorrectionHistory(recordId)]);
  } catch (error) {
    dialogFeedback.value = createCorrectionErrorFeedback(error);
  } finally {
    isSavingCorrection.value = false;
  }
}

function openDayStatusDialog(
  item: DailyAttendanceItem,
  statusType: AttendanceDayStatusType,
): void {
  selectedDayStatusTarget.value = {
    studentId: item.studentId,
    code: item.code,
    fullName: item.fullName,
    statusType,
  };
  dayStatusForm.observation = item.absence?.observation ?? '';
  dayStatusDialogFeedback.value = null;
  isDayStatusDialogOpen.value = true;
}

function closeDayStatusDialog(): void {
  selectedDayStatusTarget.value = null;
  dayStatusForm.observation = '';
  dayStatusDialogFeedback.value = null;
  isDayStatusDialogOpen.value = false;
}

async function handleSubmitDayStatus(): Promise<void> {
  if (!selectedDayStatusTarget.value) {
    return;
  }

  isSavingDayStatus.value = true;
  dayStatusDialogFeedback.value = null;

  try {
    await upsertAttendanceDayStatus({
      studentId: selectedDayStatusTarget.value.studentId,
      attendanceDate: context.attendanceDate,
      schoolYear: context.schoolYear,
      grade: context.grade,
      section: context.section,
      shift: context.shift,
      statusType: selectedDayStatusTarget.value.statusType,
      observation: dayStatusForm.observation.trim() || null,
    });

    feedback.value = {
      type: 'success',
      title: 'Estado diario registrado',
      message: `Se registro ${getAttendanceDayStatusLabel(selectedDayStatusTarget.value.statusType).toLowerCase()} para ${selectedDayStatusTarget.value.fullName}.`,
    };
    closeDayStatusDialog();
    await loadDailyView();
  } catch (error) {
    dayStatusDialogFeedback.value = {
      type: 'error',
      title: 'No se pudo guardar el estado diario',
      message: getApiErrorMessage(error),
    };
  } finally {
    isSavingDayStatus.value = false;
  }
}

async function handleResolveDayStatus(attendanceDayStatusId: string): Promise<void> {
  resolvingDayStatusId.value = attendanceDayStatusId;

  try {
    const response = await resolveAttendanceDayStatus(attendanceDayStatusId);
    feedback.value = {
      type: 'success',
      title: 'Ausencia retirada',
      message: response.message,
    };
    await loadDailyView();
  } catch (error) {
    feedback.value = {
      type: 'error',
      title: 'No se pudo retirar la ausencia',
      message: getApiErrorMessage(error),
    };
  } finally {
    resolvingDayStatusId.value = null;
  }
}

watch(
  () => props.activeSchoolYear,
  (activeSchoolYear) => {
    context.schoolYear = activeSchoolYear;
  },
  { immediate: true },
);

watch(
  () => props.enabledGrades,
  (enabledGrades) => {
    if (!enabledGrades.includes(context.grade)) {
      context.grade = enabledGrades[0] ?? 1;
    }
    handleGradeChange();
  },
  { immediate: true },
);

watch(
  () => props.enabledTurns,
  (enabledTurns) => {
    if (!enabledTurns.includes(context.shift)) {
      context.shift = enabledTurns[0] ?? 'morning';
    }
  },
  { immediate: true },
);

onMounted(async () => {
  await loadDailyView();
});
</script>
