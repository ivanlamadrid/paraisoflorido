<template>
  <div class="student-follow-up-manager">
    <div class="student-follow-up-manager__header">
      <div>
        <div class="ui-eyebrow">Seguimiento e incidencias</div>
        <div class="text-subtitle1 text-weight-bold q-mt-sm">
          Registro institucional breve
        </div>
        <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
          Mantén observaciones tutoriales e incidencias internas en un historial breve, trazable y fácil de revisar.
        </p>
      </div>
      <div class="student-follow-up-manager__summary">
        <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9">
          {{ followUps.length }} registros
        </q-chip>
        <q-chip class="ui-stat-chip" color="orange-1" text-color="orange-10">
          {{ incidentCount }} incidencias
        </q-chip>
        <q-chip class="ui-stat-chip" color="blue-1" text-color="blue-10">
          {{ tutorialCount }} observaciones
        </q-chip>
      </div>
    </div>

    <StatusBanner
      v-if="resolvedFeedback"
      class="q-mt-lg"
      :variant="resolvedFeedback.type"
      :title="resolvedFeedback.title"
      :message="resolvedFeedback.message"
    />

    <q-card flat bordered class="q-mt-lg">
      <q-card-section class="q-gutter-md">
        <div class="row items-center justify-between q-col-gutter-md">
          <div class="col-12 col-lg">
            <div class="text-subtitle2 text-weight-bold">
              Historial reciente
            </div>
            <div class="text-caption text-grey-7 q-mt-xs">
              Filtra por tipo o estado para enfocarte en el seguimiento pendiente.
            </div>
          </div>
          <div class="col-12 col-lg-auto row q-col-gutter-sm">
            <div class="col-12 col-sm-auto">
              <q-select
                v-model="listFilters.recordType"
                label="Tipo"
                outlined
                dense
                clearable
                emit-value
                map-options
                :options="recordTypeFilterOptions"
              />
            </div>
            <div class="col-12 col-sm-auto">
              <q-select
                v-model="listFilters.status"
                label="Estado"
                outlined
                dense
                clearable
                emit-value
                map-options
                :options="statusOptions"
              />
            </div>
          </div>
        </div>

        <div v-if="filteredFollowUps.length === 0" class="student-follow-up-manager__empty">
          <q-icon name="fact_check" size="24px" color="grey-6" />
          <span>No hay registros que coincidan con los filtros seleccionados.</span>
        </div>

        <q-list
          v-else
          bordered
          separator
          class="rounded-borders student-follow-up-manager__list"
        >
          <q-item v-for="item in paginatedFollowUps" :key="item.id" class="q-py-md">
            <q-item-section>
              <div class="student-follow-up-manager__item-header">
                <div>
                  <q-item-label class="text-weight-medium">
                    {{ getRecordTypeLabel(item.recordType) }}
                  </q-item-label>
                  <q-item-label caption>
                    {{ formatDate(item.recordedAt) }} · {{ item.authorDisplayName }}
                  </q-item-label>
                </div>
                <div class="row q-gutter-xs justify-end">
                  <q-chip dense class="ui-stat-chip" color="grey-2" text-color="grey-9">
                    {{ getStatusLabel(item.status) }}
                  </q-chip>
                  <q-chip
                    v-if="item.recordType === 'tutorial_note' && item.category"
                    dense
                    class="ui-stat-chip"
                    color="blue-1"
                    text-color="blue-10"
                  >
                    {{ getCategoryLabel(item.category) }}
                  </q-chip>
                  <q-chip
                    v-if="item.recordType === 'incident' && item.incidentType"
                    dense
                    class="ui-stat-chip"
                    color="orange-1"
                    text-color="orange-10"
                  >
                    {{ item.incidentType }}
                  </q-chip>
                </div>
              </div>
              <q-item-label class="q-mt-sm text-body2">
                {{ item.note }}
              </q-item-label>
              <q-item-label
                v-if="item.actionsTaken"
                class="q-mt-sm text-body2 text-grey-7"
              >
                Acciones: {{ item.actionsTaken }}
              </q-item-label>
              <q-item-label
                v-if="item.externalReference"
                class="q-mt-xs text-caption text-grey-7"
              >
                Referencia externa: {{ item.externalReference }}
              </q-item-label>
            </q-item-section>
            <q-item-section
              v-if="canEdit(item)"
              side
              top
            >
              <q-btn
                flat
                color="primary"
                icon="edit"
                label="Editar"
                no-caps
                @click="startEdit(item)"
              />
            </q-item-section>
          </q-item>
        </q-list>

        <div v-if="filteredFollowUps.length > pageSize" class="row justify-center">
          <q-pagination
            v-model="paginationPage"
            color="primary"
            :max="Math.max(1, Math.ceil(filteredFollowUps.length / pageSize))"
            max-pages="6"
            boundary-links
          />
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered class="q-mt-lg student-follow-up-manager__form-card">
      <q-card-section>
        <div class="text-subtitle2 text-weight-bold">
          {{ editingFollowUpId ? 'Actualizar registro' : 'Registrar seguimiento' }}
        </div>
        <div class="text-caption text-grey-7 q-mt-xs">
          {{ viewerRole === 'tutor'
            ? 'Tu alcance se limita a los estudiantes de tus secciones asignadas.'
            : 'El historial queda disponible para revisión institucional.' }}
        </div>

        <q-form class="student-follow-up-manager__form q-mt-lg" @submit.prevent="handleSubmit">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-4">
              <q-select
                v-model="form.recordType"
                label="Tipo de registro"
                outlined
                emit-value
                map-options
                :disable="Boolean(editingFollowUpId)"
                :options="recordTypeOptions"
              />
            </div>
            <div class="col-12 col-md-4">
              <q-input v-model="form.recordedAt" type="date" label="Fecha" outlined />
            </div>
            <div class="col-12 col-md-4">
              <q-select
                v-model="form.status"
                label="Estado"
                outlined
                emit-value
                map-options
                :options="statusOptions"
              />
            </div>
          </div>

          <div class="row q-col-gutter-md">
            <div v-if="form.recordType === 'tutorial_note'" class="col-12 col-md-6">
              <q-select
                v-model="form.category"
                label="Categoría"
                outlined
                emit-value
                map-options
                :options="categoryOptions"
              />
            </div>
            <div v-else class="col-12 col-md-6">
              <q-input
                v-model="form.incidentType"
                label="Tipo de incidencia"
                outlined
                maxlength="80"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.externalReference"
                label="Referencia externa"
                outlined
                maxlength="80"
                hint="Opcional. Por ejemplo, referencia de SíseVe."
              />
            </div>
          </div>

          <q-input
            v-model="form.note"
            type="textarea"
            autogrow
            outlined
            maxlength="500"
            label="Descripción breve"
          />

          <q-input
            v-model="form.actionsTaken"
            class="q-mt-md"
            type="textarea"
            autogrow
            outlined
            maxlength="500"
            label="Acciones tomadas"
          />

          <div class="row items-center justify-between q-gutter-sm q-mt-md">
            <div class="text-caption text-grey-7">
              Usa estados simples para distinguir lo abierto, lo que sigue en acompañamiento y lo ya cerrado.
            </div>
            <div class="row q-gutter-sm">
              <q-btn
                v-if="editingFollowUpId"
                flat
                color="primary"
                label="Cancelar"
                no-caps
                @click="resetForm"
              />
              <q-btn
                color="primary"
                :label="editingFollowUpId ? 'Guardar cambios' : submitLabel"
                no-caps
                type="submit"
                :loading="saveLoading"
              />
            </div>
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import StatusBanner from 'components/ui/StatusBanner.vue';
import type { UserRole } from 'src/types/session';
import type {
  CreateStudentFollowUpPayload,
  StudentFollowUp,
  StudentFollowUpCategory,
  StudentFollowUpRecordType,
  StudentFollowUpStatus,
  UpdateStudentFollowUpPayload,
} from 'src/types/students';

type FeedbackState = {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
};

const props = defineProps<{
  followUps: StudentFollowUp[];
  viewerRole: Extract<UserRole, 'director' | 'secretary' | 'tutor'>;
  viewerUserId?: string | null;
  feedback: FeedbackState | null;
  saveLoading: boolean;
}>();

const emit = defineEmits<{
  create: [payload: CreateStudentFollowUpPayload];
  update: [followUpId: string, payload: UpdateStudentFollowUpPayload];
}>();

const editingFollowUpId = ref<string | null>(null);
const localFeedback = ref<FeedbackState | null>(null);
const paginationPage = ref(1);
const pageSize = 5;
const listFilters = reactive<{
  recordType: StudentFollowUpRecordType | null;
  status: StudentFollowUpStatus | null;
}>({
  recordType: null,
  status: null,
});
const form = reactive({
  recordType: 'tutorial_note' as StudentFollowUpRecordType,
  category: 'attendance' as StudentFollowUpCategory,
  incidentType: '',
  recordedAt: getTodayInLima(),
  note: '',
  actionsTaken: '',
  status: 'open' as StudentFollowUpStatus,
  externalReference: '',
});

const resolvedFeedback = computed(() => localFeedback.value ?? props.feedback);
const recordTypeOptions = [
  { label: 'Observación tutorial', value: 'tutorial_note' },
  { label: 'Incidencia interna', value: 'incident' },
];
const recordTypeFilterOptions = [
  { label: 'Observación tutorial', value: 'tutorial_note' },
  { label: 'Incidencia interna', value: 'incident' },
];
const statusOptions = [
  { label: 'Abierto', value: 'open' },
  { label: 'En seguimiento', value: 'in_progress' },
  { label: 'Cerrado', value: 'closed' },
];
const categoryOptions = [
  { label: 'Asistencia', value: 'attendance' },
  { label: 'Convivencia', value: 'coexistence' },
  { label: 'Familiar', value: 'family' },
  { label: 'Riesgo', value: 'risk' },
  { label: 'Acompañamiento', value: 'support' },
];

const submitLabel = computed(() =>
  form.recordType === 'tutorial_note' ? 'Registrar observación' : 'Registrar incidencia',
);
const filteredFollowUps = computed(() =>
  props.followUps.filter((item) => {
    if (listFilters.recordType && item.recordType !== listFilters.recordType) {
      return false;
    }

    if (listFilters.status && item.status !== listFilters.status) {
      return false;
    }

    return true;
  }),
);
const paginatedFollowUps = computed(() => {
  const start = (paginationPage.value - 1) * pageSize;
  return filteredFollowUps.value.slice(start, start + pageSize);
});
const tutorialCount = computed(
  () => props.followUps.filter((item) => item.recordType === 'tutorial_note').length,
);
const incidentCount = computed(
  () => props.followUps.filter((item) => item.recordType === 'incident').length,
);

function getTodayInLima(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function resetForm(): void {
  editingFollowUpId.value = null;
  localFeedback.value = null;
  form.recordType = 'tutorial_note';
  form.category = 'attendance';
  form.incidentType = '';
  form.recordedAt = getTodayInLima();
  form.note = '';
  form.actionsTaken = '';
  form.status = 'open';
  form.externalReference = '';
}

function canEdit(item: StudentFollowUp): boolean {
  if (props.viewerRole === 'tutor') {
    return item.authorUserId === props.viewerUserId;
  }

  return true;
}

function startEdit(item: StudentFollowUp): void {
  editingFollowUpId.value = item.id;
  form.recordType = item.recordType;
  form.category = item.category ?? 'attendance';
  form.incidentType = item.incidentType ?? '';
  form.recordedAt = item.recordedAt;
  form.note = item.note;
  form.actionsTaken = item.actionsTaken ?? '';
  form.status = item.status;
  form.externalReference = item.externalReference ?? '';
}

function handleSubmit(): void {
  localFeedback.value = null;

  if (!form.recordedAt || !form.note.trim()) {
    localFeedback.value = {
      type: 'warning',
      title: 'Registro incompleto',
      message: 'Completa la fecha y la descripción breve antes de guardar.',
    };
    return;
  }

  if (form.recordType === 'tutorial_note' && !form.category) {
    localFeedback.value = {
      type: 'warning',
      title: 'Categoría requerida',
      message: 'Selecciona la categoría de la observación tutorial.',
    };
    return;
  }

  if (form.recordType === 'incident' && !form.incidentType.trim()) {
    localFeedback.value = {
      type: 'warning',
      title: 'Tipo requerido',
      message: 'Indica un tipo breve para la incidencia interna.',
    };
    return;
  }

  const createPayload: CreateStudentFollowUpPayload = {
    recordType: form.recordType,
    recordedAt: form.recordedAt,
    note: form.note.trim(),
    actionsTaken: form.actionsTaken.trim() || null,
    status: form.status,
    externalReference: form.externalReference.trim() || null,
  };

  if (form.recordType === 'tutorial_note') {
    createPayload.category = form.category;
  } else {
    createPayload.incidentType = form.incidentType.trim();
  }

  if (editingFollowUpId.value) {
    const updatePayload: UpdateStudentFollowUpPayload = {
      recordedAt: form.recordedAt,
      note: form.note.trim(),
      actionsTaken: form.actionsTaken.trim() || null,
      status: form.status,
      externalReference: form.externalReference.trim() || null,
    };

    if (form.recordType === 'tutorial_note') {
      updatePayload.category = form.category;
      updatePayload.incidentType = null;
    } else {
      updatePayload.incidentType = form.incidentType.trim();
    }

    emit('update', editingFollowUpId.value, updatePayload);
    return;
  }

  emit('create', createPayload);
}

function getRecordTypeLabel(recordType: StudentFollowUpRecordType): string {
  return recordType === 'tutorial_note' ? 'Observación tutorial' : 'Incidencia interna';
}

function getCategoryLabel(category: StudentFollowUpCategory): string {
  if (category === 'attendance') {
    return 'Asistencia';
  }

  if (category === 'coexistence') {
    return 'Convivencia';
  }

  if (category === 'family') {
    return 'Familiar';
  }

  if (category === 'risk') {
    return 'Riesgo';
  }

  return 'Acompañamiento';
}

function getStatusLabel(status: StudentFollowUpStatus): string {
  if (status === 'open') {
    return 'Abierto';
  }

  if (status === 'in_progress') {
    return 'En seguimiento';
  }

  return 'Cerrado';
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeZone: 'America/Lima',
  }).format(new Date(`${value}T00:00:00`));
}

watch(
  () => props.followUps,
  () => {
    if (!props.saveLoading) {
      resetForm();
      paginationPage.value = 1;
    }
  },
);

watch(
  () => props.feedback,
  (feedback) => {
    if (feedback) {
      localFeedback.value = null;
    }
  },
);

watch(
  () => [listFilters.recordType, listFilters.status],
  () => {
    paginationPage.value = 1;
  },
);
</script>

<style scoped>
.student-follow-up-manager {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.student-follow-up-manager__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.student-follow-up-manager__summary {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.student-follow-up-manager__item-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.student-follow-up-manager__empty {
  border: 1px dashed rgba(15, 23, 42, 0.12);
  border-radius: 18px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #6b7280;
}

.student-follow-up-manager__form-card {
  background: #f8fafc;
}

@media (max-width: 767px) {
  .student-follow-up-manager__header,
  .student-follow-up-manager__item-header {
    flex-direction: column;
  }

  .student-follow-up-manager__summary {
    justify-content: flex-start;
  }
}
</style>
