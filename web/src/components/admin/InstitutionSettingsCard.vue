<template>
  <q-card flat bordered class="admin-card q-mt-lg">
    <q-card-section class="ui-card-body">
      <div class="row items-start justify-between q-col-gutter-lg">
        <div class="col-12 col-lg">
          <div class="ui-eyebrow">Configuración institucional</div>
          <div class="text-subtitle1 text-weight-bold q-mt-sm">
            Parámetros básicos del colegio
          </div>
          <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
            Define el nombre del colegio, la contraseña inicial general y la
            estructura disponible para la operación diaria.
          </p>
        </div>
        <div class="col-12 col-lg-auto row q-gutter-sm">
          <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="school">
            {{ localForm.schoolName }}
          </q-chip>
          <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="calendar_month">
            Año activo {{ localForm.activeSchoolYear }}
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

      <q-form class="q-gutter-md q-mt-lg" @submit="handleSubmit">
        <div class="row q-col-gutter-md">
          <div class="col-12 col-lg-7">
            <q-input
              v-model="localForm.schoolName"
              label="Nombre del colegio"
              outlined
              maxlength="160"
            >
              <template #prepend>
                <q-icon name="school" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-lg-5">
            <q-card flat bordered class="settings-year-card">
              <q-card-section class="settings-year-card__body">
                <div class="text-caption text-grey-7 text-uppercase text-weight-bold">
                  Año escolar activo
                </div>
                <div class="text-subtitle1 text-weight-bold q-mt-sm">
                  {{ localForm.activeSchoolYear }}
                </div>
                <div class="text-body2 text-grey-7 q-mt-sm">
                  El cambio de año se realiza desde la herramienta segura
                  <strong>Preparar nuevo año escolar</strong>.
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <div class="row q-col-gutter-md">
          <div class="col-12 col-lg-6">
            <q-select
              v-model="localForm.enabledTurns"
              label="Turnos habilitados"
              outlined
              multiple
              emit-value
              map-options
              use-chips
              :options="allShiftOptions"
            >
              <template #prepend>
                <q-icon name="schedule" />
              </template>
            </q-select>
          </div>
          <div class="col-12 col-lg-6">
            <q-select
              v-model="localForm.enabledGrades"
              label="Grados habilitados"
              outlined
              multiple
              emit-value
              map-options
              use-chips
              :options="allGradeOptions"
            >
              <template #prepend>
                <q-icon name="school" />
              </template>
            </q-select>
          </div>
        </div>

        <q-input
          v-model="localForm.newInitialStudentPassword"
          label="Nueva contraseña inicial general (opcional)"
          outlined
          maxlength="128"
          type="password"
          hint="Si la dejas vacía, se conserva la contraseña inicial actual."
        >
          <template #prepend>
            <q-icon name="key" />
          </template>
        </q-input>

        <div class="settings-sections-grid">
          <q-input
            v-for="grade in sortedEnabledGrades"
            :key="grade"
            v-model="localForm.sectionsByGrade[String(grade)]"
            :label="`Secciones para ${grade} grado`"
            outlined
            maxlength="80"
            hint="Separa con comas. Ejemplo: A, B, C"
          >
            <template #prepend>
              <q-icon name="groups" />
            </template>
          </q-input>
        </div>

        <div class="row items-center justify-between q-gutter-sm">
          <div class="text-caption text-grey-7">
            La contraseña inicial general se reemplaza solo si ingresas un
            nuevo valor.
          </div>
          <q-btn
            color="primary"
            label="Guardar configuración"
            no-caps
            type="submit"
            :loading="loading"
          />
        </div>
      </q-form>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import StatusBanner from 'components/ui/StatusBanner.vue';
import type { StudentShift } from 'src/types/attendance';
import type {
  InstitutionSettings,
  UpdateInstitutionSettingsPayload,
} from 'src/types/institution';

type FeedbackState = {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
};

const props = defineProps<{
  settings: InstitutionSettings | null;
  loading: boolean;
  feedback: FeedbackState | null;
}>();

const emit = defineEmits<{
  save: [payload: UpdateInstitutionSettingsPayload];
}>();

const allShiftOptions: Array<{ label: string; value: StudentShift }> = [
  { label: 'Turno mañana', value: 'morning' },
  { label: 'Turno tarde', value: 'afternoon' },
];

const allGradeOptions = [1, 2, 3, 4, 5].map((grade) => ({
  label: `${grade} grado`,
  value: grade,
}));

const localForm = reactive({
  schoolName: 'Colegio Paraíso Florido 3082',
  activeSchoolYear: new Date().getFullYear(),
  enabledTurns: ['morning', 'afternoon'] as StudentShift[],
  enabledGrades: [1, 2, 3, 4, 5] as number[],
  sectionsByGrade: {
    '1': 'A',
    '2': 'A',
    '3': 'A',
    '4': 'A',
    '5': 'A',
  } as Record<string, string>,
  newInitialStudentPassword: '',
});

const sortedEnabledGrades = computed(() =>
  [...localForm.enabledGrades].sort((left, right) => left - right),
);

function parseSections(value: string | undefined): string[] {
  return Array.from(
    new Set(
      (value ?? '')
        .split(',')
        .map((section) => section.trim().toUpperCase())
        .filter((section) => section.length > 0),
    ),
  );
}

function syncForm(settings: InstitutionSettings | null): void {
  if (!settings) {
    return;
  }

  localForm.schoolName = settings.schoolName;
  localForm.activeSchoolYear = settings.activeSchoolYear;
  localForm.enabledTurns = [...settings.enabledTurns];
  localForm.enabledGrades = [...settings.enabledGrades].sort(
    (left, right) => left - right,
  );
  localForm.sectionsByGrade = Object.fromEntries(
    localForm.enabledGrades.map((grade) => [
      String(grade),
      (settings.sectionsByGrade[String(grade)] ?? []).join(', '),
    ]),
  );
  localForm.newInitialStudentPassword = '';
}

function handleSubmit(): void {
  emit('save', {
    schoolName: localForm.schoolName.trim(),
    activeSchoolYear: localForm.activeSchoolYear,
    enabledTurns: [...localForm.enabledTurns],
    enabledGrades: [...sortedEnabledGrades.value],
    sectionsByGrade: Object.fromEntries(
      sortedEnabledGrades.value.map((grade) => [
        String(grade),
        parseSections(localForm.sectionsByGrade[String(grade)]),
      ]),
    ),
    ...(localForm.newInitialStudentPassword.trim()
      ? { newInitialStudentPassword: localForm.newInitialStudentPassword.trim() }
      : {}),
  });
}

watch(
  () => props.settings,
  (settings) => {
    syncForm(settings);
  },
  { immediate: true },
);

watch(
  () => [...localForm.enabledGrades],
  (enabledGrades) => {
    localForm.sectionsByGrade = Object.fromEntries(
      enabledGrades.map((grade) => [
        String(grade),
        localForm.sectionsByGrade[String(grade)]?.trim() || 'A',
      ]),
    );
  },
  { deep: true },
);
</script>

<style scoped>
.settings-year-card {
  height: 100%;
  border-radius: 20px;
  background: #f8fafc;
}

.settings-year-card__body {
  display: grid;
  gap: 2px;
}
</style>
