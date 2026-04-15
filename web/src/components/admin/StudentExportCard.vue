<template>
  <q-card flat bordered class="admin-card q-mt-lg">
    <q-card-section class="ui-card-body">
      <div class="row items-start justify-between q-col-gutter-lg">
        <div class="col-12 col-lg">
          <div class="ui-eyebrow">Exportación de estudiantes</div>
          <div class="text-subtitle1 text-weight-bold q-mt-sm">
            Descarga útil como plantilla operativa
          </div>
          <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
            Exporta por grado, por sección o por ambos. El archivo mantiene un orden compatible con
            futuras cargas para que sirva como guía administrativa.
          </p>
        </div>
        <div class="col-12 col-lg-auto">
          <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="download">
            Excel o CSV
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

      <q-form class="admin-form-stack q-mt-lg" @submit.prevent>
        <div class="row q-col-gutter-lg admin-form-row">
          <div class="col-12 col-sm-4">
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
          <div class="col-12 col-sm-4">
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
          <div class="col-12 col-sm-4">
            <q-select
              v-model="filters.section"
              label="Sección"
              outlined
              clearable
              emit-value
              map-options
              :options="sectionOptions"
            >
              <template #prepend>
                <q-icon name="groups" />
              </template>
            </q-select>
          </div>
        </div>

        <div class="row items-center justify-between q-gutter-sm">
          <div class="text-caption text-grey-7">
            Si dejas los filtros vacíos, la exportación incluirá todos los estudiantes activos del
            año escolar.
          </div>
          <div class="row q-gutter-sm">
            <q-btn flat color="primary" label="Limpiar" no-caps @click="resetFilters" />
            <q-btn
              color="primary"
              label="Exportar Excel"
              no-caps
              :loading="loadingFormat === 'xlsx'"
              :disable="Boolean(loadingFormat)"
              @click="emitExport('xlsx')"
            />
            <q-btn
              outline
              color="primary"
              label="Exportar CSV"
              no-caps
              :loading="loadingFormat === 'csv'"
              :disable="Boolean(loadingFormat)"
              @click="emitExport('csv')"
            />
          </div>
        </div>
      </q-form>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import StatusBanner from 'components/ui/StatusBanner.vue';
import type { StudentExportFormat } from 'src/types/students';

type FeedbackState = {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
};

const props = defineProps<{
  activeSchoolYear: number;
  enabledGrades: number[];
  sectionsByGrade: Record<string, string[]>;
  loadingFormat: StudentExportFormat | null;
  feedback: FeedbackState | null;
}>();

const emit = defineEmits<{
  export: [payload: { schoolYear: number; grade?: number; section?: string; format: StudentExportFormat }];
}>();

const filters = reactive({
  schoolYear: props.activeSchoolYear,
  grade: undefined as number | undefined,
  section: undefined as string | undefined,
});

const gradeOptions = computed(() =>
  props.enabledGrades.map((grade) => ({
    label: `${grade} grado`,
    value: grade,
  })),
);

const sectionOptions = computed(() => {
  if (typeof filters.grade === 'number') {
    return (props.sectionsByGrade[String(filters.grade)] ?? []).map((section) => ({
      label: section,
      value: section,
    }));
  }

  return Array.from(
    new Set(
      Object.values(props.sectionsByGrade)
        .flat()
        .map((section) => section.trim().toUpperCase()),
    ),
  ).map((section) => ({
    label: section,
    value: section,
  }));
});

function handleGradeChange(): void {
  if (!filters.section) {
    return;
  }

  const availableSections = sectionOptions.value.map((option) => option.value);

  if (!availableSections.includes(filters.section)) {
    filters.section = undefined;
  }
}

function resetFilters(): void {
  filters.schoolYear = props.activeSchoolYear;
  filters.grade = undefined;
  filters.section = undefined;
}

function emitExport(format: StudentExportFormat): void {
  const payload: {
    schoolYear: number;
    grade?: number;
    section?: string;
    format: StudentExportFormat;
  } = {
    schoolYear: filters.schoolYear,
    format,
  };

  if (typeof filters.grade === 'number') {
    payload.grade = filters.grade;
  }

  if (filters.section) {
    payload.section = filters.section;
  }

  emit('export', payload);
}

watch(
  () => props.activeSchoolYear,
  (activeSchoolYear) => {
    filters.schoolYear = activeSchoolYear;
  },
);
</script>
