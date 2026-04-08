<template>
  <q-card flat bordered class="admin-card q-mt-lg">
    <q-card-section class="ui-card-body">
      <div class="row items-start justify-between q-col-gutter-lg">
        <div class="col-12 col-lg">
          <div class="ui-eyebrow">Alta básica</div>
          <div class="text-subtitle1 text-weight-bold q-mt-sm">
            Registrar estudiante para el año activo
          </div>
          <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
            Crea una cuenta estudiantil nueva con su código, aula y turno vigentes. El sistema
            usará la contraseña inicial institucional y exigirá cambio de contraseña en el primer
            ingreso.
          </p>
        </div>
        <div class="col-12 col-lg-auto">
          <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="person_add">
            Año {{ activeSchoolYear }}
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

      <q-form class="admin-form-stack q-mt-lg" @submit="handleSubmit">
        <div class="row q-col-gutter-lg admin-form-row">
          <div class="col-12 col-md-4">
            <q-input
              v-model="form.code"
              label="Código del estudiante"
              outlined
              maxlength="32"
            >
              <template #prepend>
                <q-icon name="badge" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-md-4">
            <q-input
              v-model="form.firstName"
              label="Nombres"
              outlined
              maxlength="80"
            >
              <template #prepend>
                <q-icon name="person" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-md-4">
            <q-input
              v-model="form.lastName"
              label="Apellidos"
              outlined
              maxlength="120"
            >
              <template #prepend>
                <q-icon name="badge" />
              </template>
            </q-input>
          </div>
        </div>

        <div class="row q-col-gutter-lg admin-form-row">
          <div class="col-12 col-md-3">
            <q-input
              v-model="form.document"
              label="Documento"
              outlined
              maxlength="20"
            >
              <template #prepend>
                <q-icon name="credit_card" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-md-3">
            <q-select
              v-model="form.grade"
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
          </div>
          <div class="col-12 col-md-3">
            <q-select
              v-model="form.section"
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
          </div>
          <div class="col-12 col-md-3">
            <q-select
              v-model="form.shift"
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
          </div>
        </div>

        <div class="admin-form-actions admin-form-actions--split admin-form-row">
          <div class="col-12 col-md">
            <q-toggle
              v-model="form.isActive"
              color="primary"
              keep-color
              label="Estudiante activo en el sistema"
            />
          </div>
          <div class="col-12 col-md-auto">
            <div class="admin-form-actions__buttons">
              <q-btn
                flat
                color="primary"
                label="Limpiar"
                no-caps
                @click="resetForm"
              />
              <q-btn
                color="primary"
                label="Crear estudiante"
                no-caps
                type="submit"
                :loading="loading"
              />
            </div>
          </div>
        </div>
      </q-form>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import StatusBanner from 'components/ui/StatusBanner.vue';
import type { StudentShift } from 'src/types/attendance';
import type { CreateStudentPayload } from 'src/types/students';

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
  loading: boolean;
  feedback: FeedbackState | null;
}>();

const emit = defineEmits<{
  save: [payload: CreateStudentPayload];
}>();

const form = reactive({
  code: '',
  firstName: '',
  lastName: '',
  document: '',
  grade: props.enabledGrades[0] ?? 1,
  section: 'A',
  shift: props.enabledTurns[0] ?? 'morning',
  isActive: true,
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
  (props.sectionsByGrade[String(form.grade)] ?? ['A']).map((section) => ({
    label: section,
    value: section,
  })),
);

function syncDefaults(): void {
  if (!props.enabledGrades.includes(form.grade)) {
    form.grade = props.enabledGrades[0] ?? 1;
  }

  if (!props.enabledTurns.includes(form.shift)) {
    form.shift = props.enabledTurns[0] ?? 'morning';
  }

  handleGradeChange();
}

function handleGradeChange(): void {
  const availableSections = props.sectionsByGrade[String(form.grade)] ?? ['A'];

  if (!availableSections.includes(form.section)) {
    form.section = availableSections[0] ?? 'A';
  }
}

function resetForm(): void {
  form.code = '';
  form.firstName = '';
  form.lastName = '';
  form.document = '';
  form.grade = props.enabledGrades[0] ?? 1;
  form.shift = props.enabledTurns[0] ?? 'morning';
  form.isActive = true;
  handleGradeChange();
}

function handleSubmit(): void {
  emit('save', {
    code: form.code.trim().toLowerCase(),
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    document: form.document.trim() || null,
    grade: form.grade,
    section: form.section,
    shift: form.shift,
    isActive: form.isActive,
    schoolYear: props.activeSchoolYear,
  });
}

watch(
  () => [props.enabledGrades, props.enabledTurns, props.sectionsByGrade],
  () => {
    syncDefaults();
  },
  { deep: true, immediate: true },
);

watch(
  () => props.feedback,
  (feedback) => {
    if (feedback?.type === 'success') {
      resetForm();
    }
  },
);
</script>
