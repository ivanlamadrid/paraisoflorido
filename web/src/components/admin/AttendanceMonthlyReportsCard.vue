<template>
  <q-card flat bordered class="admin-card q-mt-lg">
    <q-card-section class="ui-card-body">
      <div class="row items-start justify-between q-col-gutter-lg">
        <div class="col-12 col-lg">
          <div class="ui-eyebrow">Reportes mensuales</div>
          <div class="text-subtitle1 text-weight-bold q-mt-sm">
            Revisión simple por estudiante y por aula
          </div>
          <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
            Revisa porcentaje de asistencia, tardanzas, ausencias y registros incompletos
            del mes seleccionado sin salir del portal administrativo.
          </p>
        </div>
        <div class="col-12 col-lg-auto">
          <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="insights">
            {{ monthlyReport?.context.monthLabel ?? currentMonthLabel }}
          </q-chip>
        </div>
      </div>

      <StatusBanner
        v-if="feedback"
        class="q-mt-lg"
        :variant="feedback.type"
        :title="feedback.title"
        :message="feedback.message"
      />

      <q-form class="q-gutter-md q-mt-lg" @submit.prevent="handleLoadReport">
        <div class="row q-col-gutter-md">
          <div class="col-12 col-sm-6 col-lg-2">
            <q-input
              v-model="filters.month"
              label="Mes (AAAA-MM)"
              outlined
              mask="####-##"
              fill-mask
              inputmode="numeric"
              hint="Ejemplo: 2026-04"
              :rules="[
                (value) => Boolean(value) || 'Selecciona el mes',
                (value) => /^\\d{4}-(0[1-9]|1[0-2])$/.test(String(value ?? '')) || 'Usa el formato AAAA-MM',
              ]"
            >
              <template #prepend>
                <q-icon name="calendar_month" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-sm-6 col-lg-2">
            <q-input
              v-model.number="filters.schoolYear"
              type="number"
              label="Año escolar"
              outlined
              min="2000"
              max="2100"
            >
              <template #prepend>
                <q-icon name="event_note" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-sm-6 col-lg-2">
            <q-select
              v-model="filters.grade"
              label="Grado"
              outlined
              clearable
              emit-value
              map-options
              :options="gradeOptions"
              @update:model-value="handleGradeChange"
            >
              <template #prepend>
                <q-icon name="school" />
              </template>
            </q-select>
          </div>
          <div class="col-12 col-sm-6 col-lg-2">
            <q-select
              v-model="filters.section"
              label="Sección"
              outlined
              clearable
              emit-value
              map-options
              :options="sectionOptions"
              :disable="!filters.grade"
            >
              <template #prepend>
                <q-icon name="groups" />
              </template>
            </q-select>
          </div>
          <div class="col-12 col-sm-6 col-lg-2">
            <q-select
              v-model="filters.shift"
              label="Turno"
              outlined
              clearable
              emit-value
              map-options
              :options="shiftOptions"
            >
              <template #prepend>
                <q-icon name="schedule" />
              </template>
            </q-select>
          </div>
          <div class="col-12 col-lg-2">
            <q-input
              v-model="filters.search"
              label="Buscar estudiante"
              outlined
              maxlength="120"
            >
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>
        </div>

        <div class="row items-center justify-between q-gutter-sm">
          <div class="text-caption text-grey-7">
            El porcentaje del mes se calcula sobre días hábiles de lunes a viernes.
          </div>
          <div class="row q-gutter-sm">
            <q-btn flat color="primary" label="Limpiar" no-caps @click="resetFilters" />
            <q-btn
              color="primary"
              label="Cargar reporte"
              no-caps
              type="submit"
              :loading="isLoading"
            />
          </div>
        </div>
      </q-form>

      <div v-if="isLoading" class="column items-center q-py-xl q-gutter-md">
        <q-spinner color="primary" size="34px" />
        <span class="text-body2 text-grey-7">Cargando reporte mensual...</span>
      </div>

      <div
        v-else-if="!hasLoadedReport"
        class="student-operational-profile__empty-state q-mt-lg"
      >
        <q-icon name="insights" size="28px" color="grey-6" />
        <div class="text-subtitle2 text-weight-bold text-grey-8">
          Carga el reporte mensual cuando lo necesites
        </div>
        <p class="text-body2 text-grey-7 q-mb-none">
          Selecciona el mes y aplica filtros si deseas acotar la consulta. Si no
          eliges filtros academicos, el sistema mostrara el resumen institucional
          y la primera pagina del detalle por estudiante.
        </p>
      </div>

      <template v-else-if="monthlyReport">
        <div class="monthly-report-summary-grid q-mt-lg">
          <StatSummaryCard
            label="Asistencia mensual"
            :value="`${formatPercentage(monthlyReport.summary.attendancePercentage)} %`"
            icon="insights"
            tone="primary"
            :caption="`${monthlyReport.summary.attendedStudentDays} jornadas asistidas de ${monthlyReport.summary.expectedStudentDays} posibles.`"
          />
          <StatSummaryCard
            label="Estudiantes"
            :value="monthlyReport.summary.totalStudents"
            icon="groups"
            tone="dark"
            :caption="`${monthlyReport.summary.classroomsCount} aulas incluidas en el contexto.`"
          />
          <StatSummaryCard
            label="Ausencias"
            :value="monthlyReport.summary.absences"
            icon="event_busy"
            tone="warning"
            :caption="`${monthlyReport.summary.justifiedAbsences} justificadas y ${monthlyReport.summary.unjustifiedAbsences} no justificadas.`"
          />
          <StatSummaryCard
            label="Incompletos"
            :value="monthlyReport.summary.incompleteRecords"
            icon="rule"
            tone="info"
            :caption="`${monthlyReport.summary.lateEntries} tardanzas y ${monthlyReport.summary.earlyDepartures} salidas anticipadas en el mes.`"
          />
        </div>

        <div class="alerts-summary-grid q-mt-lg">
          <q-chip class="ui-stat-chip" color="blue-1" text-color="blue-10" icon="login">
            {{ monthlyReport.summary.entriesRegistered }} entradas
          </q-chip>
          <q-chip class="ui-stat-chip" color="orange-1" text-color="orange-10" icon="logout">
            {{ monthlyReport.summary.exitsRegistered }} salidas
          </q-chip>
          <q-chip class="ui-stat-chip" color="amber-1" text-color="amber-10" icon="schedule">
            {{ monthlyReport.summary.lateEntries }} tardanzas
          </q-chip>
          <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="calendar_view_month">
            {{ monthlyReport.context.schoolDays }} días hábiles del mes
          </q-chip>
        </div>

        <div class="q-mt-xl">
          <div class="ui-eyebrow">Resumen por aula</div>
          <div class="text-subtitle2 text-weight-bold q-mt-sm">
            Contexto mensual agrupado por grado, sección y turno
          </div>

          <div
            v-if="monthlyReport.classroomItems.length === 0"
            class="text-body2 text-grey-7 q-pt-md"
          >
            No hay aulas que mostrar con los filtros actuales.
          </div>

          <q-list
            v-else
            bordered
            separator
            class="rounded-borders q-mt-md monthly-report-classroom-list"
          >
            <q-item
              v-for="item in monthlyReport.classroomItems"
              :key="`${item.grade}-${item.section}-${item.shift}`"
              class="q-py-md"
            >
              <q-item-section>
                <q-item-label class="text-weight-medium">
                  {{ item.grade }} {{ item.section }} -
                  {{ item.shift === 'morning' ? 'Mañana' : 'Tarde' }}
                </q-item-label>
                <q-item-label caption>
                  {{ item.totalStudents }} estudiantes - {{ item.schoolDays }} días hábiles
                </q-item-label>
                <div class="alerts-summary-grid q-mt-sm">
                  <q-chip dense color="red-1" text-color="red-10">
                    {{ formatPercentage(item.attendancePercentage) }} % asistencia
                  </q-chip>
                  <q-chip dense color="grey-2" text-color="grey-9">
                    {{ item.absences }} ausencias
                  </q-chip>
                  <q-chip dense color="amber-1" text-color="amber-10">
                    {{ item.lateEntries }} tardanzas
                  </q-chip>
                  <q-chip dense color="blue-1" text-color="blue-10">
                    {{ item.incompleteRecords }} incompletos
                  </q-chip>
                </div>
              </q-item-section>
              <q-item-section side top>
                <div class="text-caption text-grey-7 text-right">Entradas / salidas</div>
                <div class="text-weight-bold">
                  {{ item.entriesRegistered }} / {{ item.exitsRegistered }}
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </div>

        <div class="q-mt-xl">
          <div class="ui-eyebrow">Detalle por estudiante</div>
          <div class="text-subtitle2 text-weight-bold q-mt-sm">
            Indicadores individuales del mes seleccionado
          </div>

          <div
            v-if="monthlyReport.studentItems.length === 0"
            class="text-body2 text-grey-7 q-pt-md"
          >
            No hay estudiantes que mostrar con esos filtros.
          </div>

          <div v-else class="table-wrap q-mt-md monthly-report-table">
            <q-markup-table flat separator="cell">
              <thead>
                <tr>
                  <th class="text-left">Código</th>
                  <th class="text-left">Estudiante</th>
                  <th class="text-left">Aula</th>
                  <th class="text-left">% asistencia</th>
                  <th class="text-left">Entradas</th>
                  <th class="text-left">Salidas</th>
                  <th class="text-left">Tardanzas</th>
                  <th class="text-left">Ausencias</th>
                  <th class="text-left">Incompletos</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in monthlyReport.studentItems" :key="item.studentId">
                  <td>{{ item.studentCode }}</td>
                  <td>
                    <div class="text-weight-medium">{{ item.fullName }}</div>
                    <div class="text-caption text-grey-7">
                      {{ item.document || 'Sin documento' }}
                    </div>
                  </td>
                  <td>{{ item.grade }} {{ item.section }} - {{ item.shift === 'morning' ? 'Mañana' : 'Tarde' }}</td>
                  <td>
                    <div class="text-weight-bold">
                      {{ formatPercentage(item.attendancePercentage) }} %
                    </div>
                    <div class="text-caption text-grey-7">
                      {{ item.attendedDays }} de {{ item.schoolDays }} días
                    </div>
                  </td>
                  <td>{{ item.entriesRegistered }}</td>
                  <td>{{ item.exitsRegistered }}</td>
                  <td>{{ item.lateEntries }}</td>
                  <td>{{ item.absences }}</td>
                  <td>{{ item.incompleteRecords }}</td>
                </tr>
              </tbody>
            </q-markup-table>
          </div>

          <div
            v-if="monthlyReport.studentItems.length > 0"
            class="row items-center justify-between q-gutter-sm q-mt-md"
          >
            <div class="text-caption text-grey-7">
              Mostrando
              {{ studentResultsRange.start }}
              -
              {{ studentResultsRange.end }}
              de
              {{ monthlyReport.studentTotal }}
              estudiantes.
            </div>
            <q-pagination
              v-if="monthlyReport.studentTotal > monthlyReport.studentLimit"
              v-model="studentPage"
              color="primary"
              :max="Math.max(1, Math.ceil(monthlyReport.studentTotal / monthlyReport.studentLimit))"
              max-pages="7"
              boundary-links
            />
          </div>
        </div>
      </template>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import StatusBanner from 'components/ui/StatusBanner.vue';
import StatSummaryCard from 'components/ui/StatSummaryCard.vue';
import { getMonthlyAttendanceReport } from 'src/services/api/attendance-api';
import { getApiErrorMessage } from 'src/services/api/api-errors';
import type {
  MonthlyAttendanceReportResponse,
  StudentShift,
} from 'src/types/attendance';

type FeedbackState = {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
};

const props = defineProps<{
  activeSchoolYear: number;
  enabledTurns: StudentShift[];
  enabledGrades: number[];
  sectionsByGrade: Record<string, string[]>;
}>();

const currentMonth = new Date().toISOString().slice(0, 7);
const currentMonthLabel = new Intl.DateTimeFormat('es-PE', {
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Lima',
}).format(new Date(`${currentMonth}-01T00:00:00-05:00`));

const filters = reactive({
  month: currentMonth,
  schoolYear: props.activeSchoolYear,
  grade: undefined as number | undefined,
  section: undefined as string | undefined,
  shift: undefined as StudentShift | undefined,
  search: '',
});

const monthlyReport = ref<MonthlyAttendanceReportResponse | null>(null);
const feedback = ref<FeedbackState | null>(null);
const isLoading = ref(false);
const hasLoadedReport = ref(false);
const rowsPerPage = 20;
const studentPage = ref(1);

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

const sectionOptions = computed(() => {
  if (!filters.grade) {
    return [];
  }

  return (props.sectionsByGrade[String(filters.grade)] ?? []).map((section) => ({
    label: section,
    value: section,
  }));
});

const studentResultsRange = computed(() => {
  if (!monthlyReport.value || monthlyReport.value.studentItems.length === 0) {
    return {
      start: 0,
      end: 0,
    };
  }

  const start = (monthlyReport.value.studentPage - 1) * monthlyReport.value.studentLimit + 1;
  const end = start + monthlyReport.value.studentItems.length - 1;

  return {
    start,
    end,
  };
});

function handleGradeChange(): void {
  const availableSections = sectionOptions.value.map((option) => option.value);

  if (
    filters.section &&
    availableSections.length > 0 &&
    !availableSections.includes(filters.section)
  ) {
    filters.section = undefined;
  }

  if (!filters.grade) {
    filters.section = undefined;
  }
}

function formatPercentage(value: number): string {
  return value.toFixed(1);
}

async function loadReport(): Promise<void> {
  feedback.value = null;
  isLoading.value = true;

  try {
    monthlyReport.value = await getMonthlyAttendanceReport({
      month: filters.month,
      schoolYear: filters.schoolYear,
      ...(typeof filters.grade === 'number' ? { grade: filters.grade } : {}),
      ...(filters.section ? { section: filters.section } : {}),
      ...(filters.shift ? { shift: filters.shift } : {}),
      ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
      page: studentPage.value,
      limit: rowsPerPage,
    });
    hasLoadedReport.value = true;
  } catch (error) {
    monthlyReport.value = null;
    feedback.value = {
      type: 'error',
      title: 'No se pudo cargar el reporte mensual',
      message: getApiErrorMessage(error),
    };
  } finally {
    isLoading.value = false;
  }
}

async function handleLoadReport(): Promise<void> {
  if (studentPage.value === 1) {
    await loadReport();
    return;
  }

  studentPage.value = 1;
}

function resetFilters(): void {
  filters.month = currentMonth;
  filters.schoolYear = props.activeSchoolYear;
  filters.grade = undefined;
  filters.section = undefined;
  filters.shift = undefined;
  filters.search = '';
  studentPage.value = 1;
  hasLoadedReport.value = false;
  monthlyReport.value = null;
  feedback.value = null;
}

watch(
  () => props.activeSchoolYear,
  (activeSchoolYear) => {
    filters.schoolYear = activeSchoolYear;
  },
  { immediate: true },
);

watch(
  () => props.enabledGrades,
  (enabledGrades) => {
    if (filters.grade && !enabledGrades.includes(filters.grade)) {
      filters.grade = undefined;
      filters.section = undefined;
    }
  },
  { immediate: true },
);

watch(
  () => props.enabledTurns,
  (enabledTurns) => {
    if (filters.shift && !enabledTurns.includes(filters.shift)) {
      filters.shift = undefined;
    }
  },
  { immediate: true },
);

watch(studentPage, (page, previousPage) => {
  if (!hasLoadedReport.value || page === previousPage) {
    return;
  }

  void loadReport();
});
</script>
