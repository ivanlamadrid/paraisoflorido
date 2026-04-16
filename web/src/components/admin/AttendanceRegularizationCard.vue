<template>
  <q-card flat bordered class="admin-card">
    <q-card-section class="ui-card-body">
      <div class="row items-start justify-between q-col-gutter-lg">
        <div class="col-12 col-lg">
          <div class="ui-eyebrow">Regularización de asistencia</div>
          <div class="text-subtitle1 text-weight-bold q-mt-sm">
            Cierre operativo y revisión administrativa
          </div>
          <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
            Reutiliza los registros, alertas, justificaciones y correcciones ya existentes para detectar pendientes de entrada, salida y revisión.
          </p>
        </div>
        <div class="col-12 col-lg-auto">
          <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="fact_check">
            Dirección y secretaría
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

      <q-form class="admin-form-stack q-mt-lg" @submit.prevent="handleSubmit">
        <div class="row q-col-gutter-lg admin-form-row">
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
                <q-icon name="calendar_month" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-sm-6 col-lg-2">
            <q-input v-model="filters.from" type="date" label="Desde" outlined>
              <template #prepend>
                <q-icon name="event" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-sm-6 col-lg-2">
            <q-input v-model="filters.to" type="date" label="Hasta" outlined>
              <template #prepend>
                <q-icon name="event" />
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
        </div>

        <div class="row q-col-gutter-lg admin-form-row">
          <div class="col-12 col-lg-5">
            <q-input
              v-model="filters.search"
              label="Buscar por código o estudiante"
              outlined
              maxlength="120"
            >
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-lg-3">
            <q-select
              v-model="listFilters.itemType"
              label="Tipo de pendiente"
              outlined
              clearable
              emit-value
              map-options
              :options="itemTypeOptions"
            >
              <template #prepend>
                <q-icon name="filter_alt" />
              </template>
            </q-select>
          </div>
          <div class="col-12 col-lg-4">
            <div class="regularization-actions">
              <q-btn
                flat
                color="primary"
                label="Limpiar"
                no-caps
                @click="resetFilters"
              />
              <q-btn
                color="primary"
                label="Actualizar bandeja"
                no-caps
                type="submit"
                :loading="isLoading"
              />
            </div>
          </div>
        </div>
      </q-form>

      <div class="regularization-stats-grid q-mt-lg">
        <article
          v-for="stat in summaryCards"
          :key="stat.label"
          class="regularization-stat"
        >
          <div class="regularization-stat__value">{{ stat.value }}</div>
          <div class="regularization-stat__label">{{ stat.label }}</div>
        </article>
      </div>

      <div v-if="isLoading" class="ui-loading-state q-py-xl">
        <q-spinner color="primary" size="32px" />
        <span class="text-body2 text-grey-7">Cargando bandeja de regularización...</span>
      </div>

      <div
        v-else-if="filteredItems.length === 0"
        class="student-operational-profile__empty-state q-mt-lg"
      >
        <q-icon name="check_circle" size="28px" color="green-6" />
        <div class="text-subtitle2 text-weight-bold text-grey-8">
          Sin pendientes con esos filtros
        </div>
        <p class="text-body2 text-grey-7 q-mb-none">
          No hay regularizaciones pendientes ni recurrencias relevantes en el rango consultado.
        </p>
      </div>

      <template v-else>
        <div v-if="isMobile" class="q-mt-lg">
          <q-list bordered separator class="rounded-borders support-list">
            <q-item
              v-for="(item, index) in paginatedItems"
              :key="buildRegularizationItemKey(item, index)"
              class="q-py-md"
            >
              <q-item-section>
                <q-item-label class="text-weight-medium">
                  {{ item.fullName }}
                </q-item-label>
                <q-item-label caption>
                  {{ item.studentCode }} · {{ item.grade }} {{ item.section }} ·
                  {{ item.shift === 'morning' ? 'Turno mañana' : 'Turno tarde' }}
                </q-item-label>
                <div class="row q-gutter-sm q-mt-sm">
                  <q-chip
                    dense
                    :color="getItemTone(item.itemType).color"
                    :text-color="getItemTone(item.itemType).textColor"
                    :icon="getItemTone(item.itemType).icon"
                  >
                    {{ getItemLabel(item.itemType) }}
                  </q-chip>
                  <q-chip dense color="grey-2" text-color="grey-8" icon="event">
                    {{ formatDate(item.attendanceDate) }}
                  </q-chip>
                </div>
                <q-item-label class="q-mt-sm text-body2">
                  {{ item.statusLabel }}
                </q-item-label>
                <q-item-label
                  v-if="item.supportLabel"
                  class="q-mt-xs text-caption text-grey-7"
                >
                  {{ item.supportLabel }}
                </q-item-label>
              </q-item-section>
              <q-item-section side top>
                <q-btn
                  flat
                  color="secondary"
                  class="support-action-btn"
                  label="Abrir ficha"
                  no-caps
                  @click="emit('openStudent', item.studentId, item.studentCode, item.fullName)"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </div>

        <div v-else class="table-wrap q-mt-lg">
          <q-markup-table flat separator="cell">
            <thead>
              <tr>
                <th class="text-left">Estudiante</th>
                <th class="text-left">Pendiente</th>
                <th class="text-left">Fecha</th>
                <th class="text-left">Detalle</th>
                <th class="text-left">Apoyo</th>
                <th class="text-left">Ficha</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in paginatedItems"
                :key="buildRegularizationItemKey(item, index)"
              >
                <td>
                  <div class="text-weight-medium">{{ item.fullName }}</div>
                  <div class="text-caption text-grey-7">
                    {{ item.studentCode }} · {{ item.grade }} {{ item.section }} ·
                    {{ item.shift === 'morning' ? 'Mañana' : 'Tarde' }}
                  </div>
                </td>
                <td>
                  <q-chip
                    dense
                    :color="getItemTone(item.itemType).color"
                    :text-color="getItemTone(item.itemType).textColor"
                    :icon="getItemTone(item.itemType).icon"
                  >
                    {{ getItemLabel(item.itemType) }}
                  </q-chip>
                </td>
                <td>{{ formatDate(item.attendanceDate) }}</td>
                <td>
                  <div>{{ item.statusLabel }}</div>
                  <div v-if="item.observation" class="text-caption text-grey-7 q-mt-xs">
                    {{ item.observation }}
                  </div>
                </td>
                <td class="text-body2">{{ item.supportLabel || 'Sin detalle adicional' }}</td>
                <td>
                  <q-btn
                    flat
                    color="secondary"
                    class="support-action-btn"
                    label="Abrir ficha"
                    no-caps
                    @click="emit('openStudent', item.studentId, item.studentCode, item.fullName)"
                  />
                </td>
              </tr>
            </tbody>
          </q-markup-table>
        </div>

        <div v-if="filteredItems.length > rowsPerPage" class="row justify-center q-mt-lg">
          <q-pagination
            v-model="paginationPage"
            color="primary"
            :max="Math.max(1, Math.ceil(filteredItems.length / rowsPerPage))"
            max-pages="7"
            boundary-links
          />
        </div>
      </template>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import StatusBanner from 'components/ui/StatusBanner.vue';
import { getAttendanceRegularization } from 'src/services/api/attendance-api';
import { getApiErrorMessage } from 'src/services/api/api-errors';
import type {
  AttendanceRegularizationItem,
  AttendanceRegularizationItemType,
  AttendanceRegularizationQuery,
  AttendanceRegularizationResponse,
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

const emit = defineEmits<{
  openStudent: [studentId: string, code: string, fullName: string];
}>();

const $q = useQuasar();
const rowsPerPage = 8;
const isMobile = computed(() => $q.screen.lt.md);
const paginationPage = ref(1);
const listFilters = reactive<{
  itemType: AttendanceRegularizationItemType | null;
}>({
  itemType: null,
});
const filters = reactive({
  schoolYear: props.activeSchoolYear,
  from: getRelativeDate(-6),
  to: getRelativeDate(0),
  grade: undefined as number | undefined,
  section: undefined as string | undefined,
  shift: undefined as StudentShift | undefined,
  search: '',
});

const isLoading = ref(false);
const feedback = ref<FeedbackState | null>(null);
const items = ref<AttendanceRegularizationItem[]>([]);
const summary = ref<AttendanceRegularizationResponse['summary']>({
  pendingEntries: 0,
  pendingExits: 0,
  lateEntriesForReview: 0,
  pendingJustifications: 0,
  recentCorrections: 0,
  studentsWithRecurringAlerts: 0,
  totalItems: 0,
});

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
  (filters.grade ? props.sectionsByGrade[String(filters.grade)] ?? [] : []).map((section) => ({
    label: section,
    value: section,
  })),
);

const itemTypeOptions = [
  { label: 'Entrada pendiente', value: 'pending_entry' },
  { label: 'Salida pendiente', value: 'pending_exit' },
  { label: 'Tardanza por revisar', value: 'late_entry_review' },
  { label: 'Justificación pendiente', value: 'pending_justification' },
  { label: 'Corrección reciente', value: 'recent_correction' },
  { label: 'Recurrencia de alerta', value: 'high_alert_recurrence' },
] as const;

const summaryCards = computed(() => [
  { label: 'Entradas pendientes', value: summary.value.pendingEntries },
  { label: 'Salidas pendientes', value: summary.value.pendingExits },
  { label: 'Tardanzas por revisar', value: summary.value.lateEntriesForReview },
  { label: 'Justificaciones pendientes', value: summary.value.pendingJustifications },
  { label: 'Correcciones recientes', value: summary.value.recentCorrections },
  { label: 'Recurrencias de alerta', value: summary.value.studentsWithRecurringAlerts },
]);

const filteredItems = computed(() =>
  items.value.filter((item) => {
    if (listFilters.itemType && item.itemType !== listFilters.itemType) {
      return false;
    }

    return true;
  }),
);
const paginatedItems = computed(() => {
  const start = (paginationPage.value - 1) * rowsPerPage;
  return filteredItems.value.slice(start, start + rowsPerPage);
});

function getRelativeDate(offsetDays: number): string {
  const base = new Date();
  base.setDate(base.getDate() + offsetDays);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(base);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeZone: 'America/Lima',
  }).format(new Date(`${value}T00:00:00-05:00`));
}

function handleGradeChange(): void {
  const availableSections = sectionOptions.value.map((option) => option.value);

  if (filters.section && !availableSections.includes(filters.section)) {
    filters.section = undefined;
  }

  if (!filters.grade) {
    filters.section = undefined;
  }
}

function getItemLabel(itemType: AttendanceRegularizationItemType): string {
  if (itemType === 'pending_entry') {
    return 'Entrada pendiente';
  }

  if (itemType === 'pending_exit') {
    return 'Salida pendiente';
  }

  if (itemType === 'late_entry_review') {
    return 'Tardanza por revisar';
  }

  if (itemType === 'pending_justification') {
    return 'Justificación pendiente';
  }

  if (itemType === 'recent_correction') {
    return 'Corrección reciente';
  }

  return 'Recurrencia de alerta';
}

function getItemTone(itemType: AttendanceRegularizationItemType): {
  color: string;
  textColor: string;
  icon: string;
} {
  if (itemType === 'pending_entry') {
    return { color: 'red-1', textColor: 'red-10', icon: 'login' };
  }

  if (itemType === 'pending_exit') {
    return { color: 'orange-1', textColor: 'orange-10', icon: 'logout' };
  }

  if (itemType === 'late_entry_review') {
    return { color: 'amber-1', textColor: 'amber-10', icon: 'schedule' };
  }

  if (itemType === 'pending_justification') {
    return { color: 'deep-orange-1', textColor: 'deep-orange-10', icon: 'rule' };
  }

  if (itemType === 'recent_correction') {
    return { color: 'blue-1', textColor: 'blue-10', icon: 'history' };
  }

  return { color: 'purple-1', textColor: 'purple-10', icon: 'priority_high' };
}

function buildRegularizationItemKey(
  item: AttendanceRegularizationItem,
  index: number,
): string {
  return [
    item.itemType,
    item.studentId,
    item.attendanceDate,
    item.statusLabel,
    item.supportLabel ?? '',
    item.observation ?? '',
    index,
  ].join('::');
}

async function loadRegularization(): Promise<void> {
  feedback.value = null;
  isLoading.value = true;

  try {
    const query: AttendanceRegularizationQuery = {
      schoolYear: filters.schoolYear,
      from: filters.from,
      to: filters.to,
      limit: 120,
    };

    if (typeof filters.grade === 'number') {
      query.grade = filters.grade;
    }

    if (filters.section) {
      query.section = filters.section;
    }

    if (filters.shift) {
      query.shift = filters.shift;
    }

    if (filters.search.trim()) {
      query.search = filters.search.trim();
    }

    const response = await getAttendanceRegularization(query);

    items.value = response.items;
    summary.value = response.summary;
  } catch (error) {
    items.value = [];
    summary.value = {
      pendingEntries: 0,
      pendingExits: 0,
      lateEntriesForReview: 0,
      pendingJustifications: 0,
      recentCorrections: 0,
      studentsWithRecurringAlerts: 0,
      totalItems: 0,
    };
    feedback.value = {
      type: 'error',
      title: 'No se pudo cargar la bandeja',
      message: getApiErrorMessage(error),
    };
  } finally {
    isLoading.value = false;
  }
}

function handleSubmit(): void {
  if (!filters.from || !filters.to) {
    feedback.value = {
      type: 'warning',
      title: 'Rango incompleto',
      message: 'Selecciona la fecha inicial y final para cargar la bandeja.',
    };
    return;
  }

  if (filters.from > filters.to) {
    feedback.value = {
      type: 'warning',
      title: 'Rango inválido',
      message: 'La fecha inicial no puede ser mayor que la final.',
    };
    return;
  }

  void loadRegularization();
}

function resetFilters(): void {
  filters.schoolYear = props.activeSchoolYear;
  filters.from = getRelativeDate(-6);
  filters.to = getRelativeDate(0);
  filters.grade = undefined;
  filters.section = undefined;
  filters.shift = undefined;
  filters.search = '';
  listFilters.itemType = null;
  paginationPage.value = 1;
  void loadRegularization();
}

watch(
  () => props.activeSchoolYear,
  (value) => {
    filters.schoolYear = value;
  },
);

watch(
  () => [listFilters.itemType, items.value.length],
  () => {
    paginationPage.value = 1;
  },
);

onMounted(() => {
  void loadRegularization();
});
</script>

<style scoped>
.regularization-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  height: 100%;
  align-items: center;
}

.regularization-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.regularization-stat {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 18px;
  padding: 14px 16px;
  background: #f8fafc;
}

.regularization-stat__value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

.regularization-stat__label {
  margin-top: 4px;
  font-size: 0.8rem;
  color: #6b7280;
}
</style>
