<template>
  <q-page class="announcements-page">
    <div class="ui-page-shell">
      <div class="row items-center q-col-gutter-sm q-mb-lg">
        <div class="col-auto">
          <q-btn
            flat
            color="primary"
            icon="arrow_back"
            label="Volver a gestión"
            no-caps
            @click="router.push('/portal/comunicados')"
          />
        </div>
      </div>

      <PageIntroCard
        eyebrow="Edición"
        :title="isEditing ? 'Editar comunicado' : 'Nuevo comunicado'"
        description="Completa la información esencial, define la audiencia y decide si el comunicado quedará en borrador, programado o publicado."
      >
        <template #meta>
          <q-chip
            class="ui-stat-chip"
            color="grey-2"
            text-color="grey-9"
            icon="calendar_month"
          >
            Año activo {{ institutionStore.settings?.activeSchoolYear ?? currentSchoolYear }}
          </q-chip>
          <q-chip
            v-if="announcementDetail"
            class="ui-stat-chip"
            :color="getAnnouncementStatusTone(announcementDetail.status).color"
            :text-color="getAnnouncementStatusTone(announcementDetail.status).textColor"
            :icon="getAnnouncementStatusTone(announcementDetail.status).icon"
          >
            {{ getAnnouncementStatusLabel(announcementDetail.status) }}
          </q-chip>
        </template>
      </PageIntroCard>

      <StatusBanner
        v-if="feedback"
        class="q-mt-lg"
        :variant="feedback.type"
        :title="feedback.title"
        :message="feedback.message"
      />

      <div v-if="isLoading" class="ui-loading-state q-mt-lg">
        <q-spinner color="primary" size="34px" />
        <span class="text-body2 text-grey-7">Preparando formulario...</span>
      </div>

      <q-form v-else class="q-gutter-lg q-mt-lg" @submit.prevent="handleSaveDraft">
        <q-card flat bordered class="announcement-form-card">
          <q-card-section class="ui-card-body">
            <div class="ui-eyebrow">Contenido</div>
            <div class="text-subtitle1 text-weight-bold q-mt-sm">
              Datos principales del comunicado
            </div>

            <div class="row q-col-gutter-lg q-mt-lg">
              <div class="col-12 col-lg-8">
                <q-input v-model="form.title" label="Título" outlined maxlength="160" />
              </div>
              <div class="col-12 col-sm-6 col-lg-2">
                <q-select
                  v-model="form.type"
                  label="Categoría"
                  outlined
                  emit-value
                  map-options
                  :options="typeOptions"
                />
              </div>
              <div class="col-12 col-sm-6 col-lg-2">
                <q-select
                  v-model="form.priority"
                  label="Prioridad"
                  outlined
                  emit-value
                  map-options
                  :options="priorityOptions"
                />
              </div>
              <div class="col-12">
                <q-input
                  v-model="form.summary"
                  label="Resumen corto"
                  outlined
                  type="textarea"
                  autogrow
                  maxlength="280"
                />
              </div>
              <div class="col-12">
                <q-input
                  v-model="form.body"
                  label="Cuerpo del comunicado"
                  outlined
                  type="textarea"
                  autogrow
                  maxlength="6000"
                />
              </div>
              <div class="col-12">
                <q-banner rounded class="bg-blue-1 text-blue-10">
                  Para el caso simple, completa el contenido, define la audiencia y usa
                  <span class="text-weight-bold">{{ publishActionLabel }}</span>.
                  Lo siguiente solo hace falta si deseas programar, limitar la visibilidad o fijar el comunicado.
                </q-banner>
              </div>
              <div class="col-12">
                <div class="text-caption text-grey-7 text-uppercase text-weight-bold">
                  Opciones avanzadas de publicación y visibilidad
                </div>
              </div>
              <div class="col-12 col-md-4">
                <q-input
                  v-model="form.scheduledAt"
                  label="Publicación programada"
                  outlined
                  type="datetime-local"
                />
              </div>
              <div class="col-12 col-md-4">
                <q-input
                  v-model="form.visibleFrom"
                  label="Visible desde"
                  outlined
                  type="datetime-local"
                />
              </div>
              <div class="col-12 col-md-4">
                <q-input
                  v-model="form.visibleUntil"
                  label="Visible hasta"
                  outlined
                  type="datetime-local"
                />
              </div>
              <div class="col-12">
                <q-toggle
                  v-model="form.isPinned"
                  label="Fijar comunicado para mostrarlo primero"
                  color="primary"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>

        <q-card flat bordered class="announcement-form-card">
          <q-card-section class="ui-card-body">
            <div class="row items-center justify-between q-col-gutter-lg">
              <div class="col-12 col-lg">
                <div class="ui-eyebrow">Audiencia</div>
                <div class="text-subtitle1 text-weight-bold q-mt-sm">
                  Define quién debe ver este comunicado
                </div>
                <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                  Usa segmentos concretos solo cuando haga falta. La audiencia es obligatoria para
                  publicar.
                </p>
              </div>
              <div class="col-12 col-lg-auto">
                <q-btn
                  flat
                  color="primary"
                  icon="add"
                  label="Agregar segmento"
                  no-caps
                  @click="addAudienceRow()"
                />
              </div>
            </div>

            <div class="q-gutter-md q-mt-lg">
              <q-card
                v-for="row in audienceRows"
                :key="row.id"
                flat
                bordered
                class="announcement-audience-row"
              >
                <q-card-section class="ui-card-body">
                  <div class="row q-col-gutter-lg items-start">
                    <div class="col-12 col-lg-3">
                      <q-select
                        v-model="row.audienceType"
                        label="Segmento"
                        outlined
                        emit-value
                        map-options
                        :options="audienceTypeOptions"
                        @update:model-value="handleAudienceTypeChange(row)"
                      />
                    </div>

                    <div v-if="row.audienceType === 'role'" class="col-12 col-lg-3">
                      <q-select
                        v-model="row.role"
                        label="Rol"
                        outlined
                        emit-value
                        map-options
                        :options="roleOptions"
                      />
                    </div>

                    <template
                      v-if="['student_grade', 'student_classroom', 'student_shift'].includes(row.audienceType)"
                    >
                      <div class="col-12 col-md-4 col-lg-2">
                        <q-input
                          v-model.number="row.schoolYear"
                          type="number"
                          label="Año escolar"
                          outlined
                          min="2000"
                          max="2100"
                        />
                      </div>
                    </template>

                    <div
                      v-if="['student_grade', 'student_classroom'].includes(row.audienceType)"
                      class="col-12 col-md-4 col-lg-2"
                    >
                      <q-select
                        v-model="row.grade"
                        label="Grado"
                        outlined
                        emit-value
                        map-options
                        :options="gradeOptions"
                        @update:model-value="handleAudienceGradeChange(row)"
                      />
                    </div>

                    <div
                      v-if="row.audienceType === 'student_classroom'"
                      class="col-12 col-md-4 col-lg-2"
                    >
                      <q-select
                        v-model="row.section"
                        label="Sección"
                        outlined
                        emit-value
                        map-options
                        :options="getSectionOptions(row.grade)"
                        :disable="!row.grade"
                      />
                    </div>

                    <div
                      v-if="['student_classroom', 'student_shift'].includes(row.audienceType)"
                      class="col-12 col-md-4 col-lg-2"
                    >
                      <q-select
                        v-model="row.shift"
                        label="Turno"
                        outlined
                        emit-value
                        map-options
                        :options="shiftOptions"
                      />
                    </div>

                    <template v-if="row.audienceType === 'student'">
                      <div class="col-12 col-md-6 col-lg-3">
                        <q-input
                          v-model="row.studentCode"
                          label="Código del estudiante"
                          outlined
                          maxlength="32"
                        />
                      </div>
                      <div class="col-12 col-md-6 col-lg-3 row items-center">
                        <q-btn
                          flat
                          color="primary"
                          icon="search"
                          label="Validar estudiante"
                          no-caps
                          :loading="row.isResolving"
                          @click="resolveStudentAudience(row)"
                        />
                      </div>
                    </template>

                    <div class="col-12 col-lg-auto row items-center justify-end">
                      <q-btn
                        flat
                        color="negative"
                        icon="delete"
                        label="Quitar"
                        no-caps
                        @click="removeAudienceRow(row.id)"
                      />
                    </div>
                  </div>

                  <div v-if="row.studentLabel" class="text-body2 text-grey-7 q-mt-md">
                    {{ row.studentLabel }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </q-card-section>
        </q-card>

        <q-card flat bordered class="announcement-form-card">
          <q-card-section class="ui-card-body">
            <div class="row items-center justify-between q-col-gutter-lg">
              <div class="col-12 col-lg">
                <div class="ui-eyebrow">Enlaces</div>
                <div class="text-subtitle1 text-weight-bold q-mt-sm">
                  Recursos opcionales
                </div>
                <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                  Puedes incluir hasta cinco enlaces. No se permiten archivos adjuntos en este MVP.
                </p>
              </div>
              <div class="col-12 col-lg-auto">
                <q-btn
                  flat
                  color="primary"
                  icon="add_link"
                  label="Agregar enlace"
                  no-caps
                  :disable="linkRows.length >= 5"
                  @click="addLinkRow()"
                />
              </div>
            </div>

            <div class="q-gutter-md q-mt-lg">
              <div
                v-for="row in linkRows"
                :key="row.id"
                class="row q-col-gutter-lg announcement-link-row"
              >
                <div class="col-12 col-md-4">
                  <q-input
                    v-model="row.label"
                    label="Texto del enlace"
                    outlined
                    maxlength="120"
                  />
                </div>
                <div class="col-12 col-md-7">
                  <q-input
                    v-model="row.url"
                    label="URL"
                    outlined
                    maxlength="500"
                  />
                </div>
                <div class="col-12 col-md-1 row items-center justify-end">
                  <q-btn
                    flat
                    round
                    color="negative"
                    icon="close"
                    @click="removeLinkRow(row.id)"
                  />
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <div class="announcement-form-actions">
          <q-btn
            flat
            color="primary"
            icon="visibility"
            label="Vista previa"
            no-caps
            @click="isPreviewOpen = true"
          />
          <q-btn
            outline
            color="primary"
            label="Guardar borrador"
            no-caps
            :loading="isSaving"
            @click="handleSaveDraft"
          />
          <q-btn
            color="primary"
            :label="publishActionLabel"
            no-caps
            :loading="isPublishing"
            @click="handlePublish"
          />
          <q-btn
            v-if="canArchiveAnnouncement"
            flat
            color="negative"
            icon="archive"
            label="Archivar"
            no-caps
            :loading="isArchiving"
            @click="handleArchive"
          />
          <q-btn
            v-if="canDeleteAnnouncement"
            flat
            color="negative"
            icon="delete"
            label="Eliminar"
            no-caps
            :loading="isDeleting"
            @click="handleDelete"
          />
        </div>
      </q-form>

      <AnnouncementPreviewDialog
        v-model="isPreviewOpen"
        :title="form.title"
        :summary="form.summary"
        :body="form.body"
        :type="form.type"
        :priority="form.priority"
        :is-pinned="form.isPinned"
        :scheduled-at="normalizedScheduledAt"
        :visible-from="normalizedVisibleFrom"
        :visible-until="normalizedVisibleUntil"
        :audience-labels="previewAudienceLabels"
        :links="previewLinks"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AnnouncementPreviewDialog from 'components/announcements/AnnouncementPreviewDialog.vue';
import PageIntroCard from 'components/ui/PageIntroCard.vue';
import StatusBanner from 'components/ui/StatusBanner.vue';
import { getApiErrorMessage } from 'src/services/api/api-errors';
import {
  archiveAnnouncement,
  createAnnouncement,
  deleteAnnouncement,
  getAdminAnnouncementDetail,
  publishAnnouncement,
  updateAnnouncement,
} from 'src/services/api/announcements-api';
import { getStudentByCode } from 'src/services/api/students-api';
import { useInstitutionStore } from 'src/stores/institution-store';
import type {
  AnnouncementAdminDetail,
  AnnouncementAudienceInput,
  AnnouncementAudienceType,
  AnnouncementPriority,
  AnnouncementType,
  CreateAnnouncementPayload,
} from 'src/types/announcements';
import type { StudentShift } from 'src/types/attendance';
import type { UserRole } from 'src/types/session';
import {
  fromDateTimeLocalInput,
  getShiftLabel,
  getAnnouncementStatusLabel,
  getAnnouncementStatusTone,
  toDateTimeLocalInput,
} from 'src/utils/announcements';

type FeedbackState = {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
};

type LinkRow = {
  id: string;
  label: string;
  url: string;
};

type AudienceRow = {
  id: string;
  audienceType: AnnouncementAudienceType;
  role: UserRole | null;
  schoolYear: number | null;
  grade: number | null;
  section: string | null;
  shift: StudentShift | null;
  studentId: string | null;
  studentCode: string | null;
  studentLabel: string | null;
  isResolving: boolean;
};

const route = useRoute();
const router = useRouter();
const institutionStore = useInstitutionStore();

const feedback = ref<FeedbackState | null>(null);
const isLoading = ref(false);
const isSaving = ref(false);
const isPublishing = ref(false);
const isArchiving = ref(false);
const isDeleting = ref(false);
const isPreviewOpen = ref(false);
const announcementDetail = ref<AnnouncementAdminDetail | null>(null);

const form = reactive({
  title: '',
  summary: '',
  body: '',
  type: 'institutional' as AnnouncementType,
  priority: 'normal' as AnnouncementPriority,
  isPinned: false,
  scheduledAt: '',
  visibleFrom: '',
  visibleUntil: '',
});

const linkRows = ref<LinkRow[]>([]);
const audienceRows = ref<AudienceRow[]>([]);

const currentSchoolYear = computed(
  () => institutionStore.settings?.activeSchoolYear ?? new Date().getFullYear(),
);
const isEditing = computed(() => typeof route.params.id === 'string');
const publishActionLabel = computed(() =>
  form.scheduledAt ? 'Guardar y programar' : 'Guardar y publicar',
);
const canArchiveAnnouncement = computed(
  () => announcementDetail.value?.canArchive ?? false,
);
const canDeleteAnnouncement = computed(
  () => announcementDetail.value?.canDelete ?? false,
);
const normalizedScheduledAt = computed(
  () => fromDateTimeLocalInput(form.scheduledAt) ?? null,
);
const normalizedVisibleFrom = computed(
  () => fromDateTimeLocalInput(form.visibleFrom) ?? null,
);
const normalizedVisibleUntil = computed(
  () => fromDateTimeLocalInput(form.visibleUntil) ?? null,
);
const previewLinks = computed(() =>
  linkRows.value
    .filter((row) => row.label.trim() || row.url.trim())
    .map((row) => ({
      label: row.label.trim() || 'Enlace',
      url: row.url.trim() || 'Sin URL',
    })),
);
const previewAudienceLabels = computed(() =>
  audienceRows.value
    .map((row) => getAudiencePreviewLabel(row))
    .filter((label): label is string => Boolean(label)),
);

const typeOptions = [
  { label: 'Institucional', value: 'institutional' },
  { label: 'Administrativo', value: 'administrative' },
  { label: 'Académico', value: 'academic' },
  { label: 'Asistencia', value: 'attendance' },
] as const;

const priorityOptions = [
  { label: 'Normal', value: 'normal' },
  { label: 'Importante', value: 'important' },
  { label: 'Urgente', value: 'urgent' },
] as const;

const audienceTypeOptions = [
  { label: 'Todos', value: 'all' },
  { label: 'Todos los estudiantes', value: 'all_students' },
  { label: 'Todo el personal', value: 'all_staff' },
  { label: 'Rol específico', value: 'role' },
  { label: 'Estudiantes por grado', value: 'student_grade' },
  { label: 'Estudiantes por aula', value: 'student_classroom' },
  { label: 'Estudiantes por turno', value: 'student_shift' },
  { label: 'Estudiante específico', value: 'student' },
] as const;

const roleOptions = [
  { label: 'Director', value: 'director' },
  { label: 'Secretaría', value: 'secretary' },
  { label: 'Auxiliar', value: 'auxiliary' },
  { label: 'Estudiante', value: 'student' },
] as const;

const gradeOptions = computed(() =>
  (institutionStore.settings?.enabledGrades ?? [1, 2, 3, 4, 5]).map((grade) => ({
    label: `${grade} grado`,
    value: grade,
  })),
);

const shiftOptions = [
  { label: 'Mañana', value: 'morning' },
  { label: 'Tarde', value: 'afternoon' },
] as const;

function generateRowId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function addLinkRow(): void {
  linkRows.value.push({
    id: generateRowId(),
    label: '',
    url: '',
  });
}

function removeLinkRow(rowId: string): void {
  linkRows.value = linkRows.value.filter((row) => row.id !== rowId);
}

function addAudienceRow(audienceType: AnnouncementAudienceType = 'all'): void {
  audienceRows.value.push({
    id: generateRowId(),
    audienceType,
    schoolYear: currentSchoolYear.value,
    role: null,
    grade: null,
    section: null,
    shift: null,
    studentId: null,
    studentCode: null,
    studentLabel: null,
    isResolving: false,
  });
}

function removeAudienceRow(rowId: string): void {
  audienceRows.value = audienceRows.value.filter((row) => row.id !== rowId);
}

function handleAudienceTypeChange(row: AudienceRow): void {
  row.role = null;
  row.schoolYear = currentSchoolYear.value;
  row.grade = null;
  row.section = null;
  row.shift = null;
  row.studentId = null;
  row.studentCode = null;
  row.studentLabel = null;
}

function handleAudienceGradeChange(row: AudienceRow): void {
  if (row.audienceType === 'student_classroom') {
    row.section = null;
  }
}

function getAudiencePreviewLabel(row: AudienceRow): string | null {
  if (row.audienceType === 'all') {
    return 'Toda la comunidad con acceso al feed';
  }

  if (row.audienceType === 'all_students') {
    return 'Todos los estudiantes';
  }

  if (row.audienceType === 'all_staff') {
    return 'Todo el personal del colegio';
  }

  if (row.audienceType === 'role' && row.role) {
    return roleOptions.find((option) => option.value === row.role)?.label ?? row.role;
  }

  if (row.audienceType === 'student_grade' && row.grade) {
    return `${row.grade} grado · ${row.schoolYear ?? currentSchoolYear.value}`;
  }

  if (
    row.audienceType === 'student_classroom' &&
    row.grade &&
    row.section &&
    row.shift
  ) {
    return `${row.grade} ${row.section} · ${getShiftLabel(row.shift)} · ${row.schoolYear ?? currentSchoolYear.value}`;
  }

  if (row.audienceType === 'student_shift' && row.shift) {
    return `${getShiftLabel(row.shift)} · ${row.schoolYear ?? currentSchoolYear.value}`;
  }

  if (row.audienceType === 'student' && row.studentLabel) {
    return row.studentLabel;
  }

  return null;
}

function getSectionOptions(grade: number | null): { label: string; value: string }[] {
  if (!grade) {
    return [];
  }

  const sections =
    institutionStore.settings?.sectionsByGrade[String(grade)] ?? [];

  return sections.map((section) => ({
    label: section,
    value: section,
  }));
}

async function resolveStudentAudience(row: AudienceRow): Promise<void> {
  const studentCode = row.studentCode?.trim().toLowerCase();

  if (!studentCode) {
    feedback.value = {
      type: 'warning',
      title: 'Código requerido',
      message: 'Ingresa el código del estudiante para validar la audiencia.',
    };
    return;
  }

  row.isResolving = true;

  try {
    const student = await getStudentByCode(studentCode);
    row.studentId = student.id;
    row.studentCode = student.code;
    row.studentLabel = `${student.fullName} - ${student.code}`;
  } catch (error) {
    row.studentId = null;
    row.studentLabel = null;
    feedback.value = {
      type: 'error',
      title: 'No se pudo validar al estudiante',
      message: getApiErrorMessage(error),
    };
  } finally {
    row.isResolving = false;
  }
}

function hydrateForm(detail: AnnouncementAdminDetail): void {
  announcementDetail.value = detail;
  form.title = detail.title;
  form.summary = detail.summary;
  form.body = detail.body;
  form.type = detail.type;
  form.priority = detail.priority;
  form.isPinned = detail.isPinned;
  form.scheduledAt = toDateTimeLocalInput(detail.scheduledAt);
  form.visibleFrom = toDateTimeLocalInput(detail.visibleFrom);
  form.visibleUntil = toDateTimeLocalInput(detail.visibleUntil);
  linkRows.value = detail.links.map((link) => ({
    id: link.id,
    label: link.label,
    url: link.url,
  }));
  audienceRows.value = detail.audiences.map((audience) => ({
    id: audience.id,
    audienceType: audience.audienceType,
    role: audience.role ?? null,
    schoolYear: audience.schoolYear ?? currentSchoolYear.value,
    grade: audience.grade ?? null,
    section: audience.section ?? null,
    shift: audience.shift ?? null,
    studentId: audience.studentId ?? null,
    studentCode: audience.studentCode ?? null,
    studentLabel:
      audience.studentCode && audience.studentFullName
        ? `${audience.studentFullName} - ${audience.studentCode}`
        : null,
    isResolving: false,
  }));
}

function buildAudiencePayload(): AnnouncementAudienceInput[] | null {
  if (audienceRows.value.length === 0) {
    feedback.value = {
      type: 'warning',
      title: 'Audiencia requerida',
      message: 'Agrega al menos un segmento de audiencia.',
    };
    return null;
  }

  const payload: AnnouncementAudienceInput[] = [];

  for (const row of audienceRows.value) {
    if (row.audienceType === 'student' && !row.studentId) {
      feedback.value = {
        type: 'warning',
        title: 'Estudiante pendiente',
        message:
          'Valida el estudiante específico antes de guardar el comunicado.',
      };
      return null;
    }

    const audience: AnnouncementAudienceInput = {
      audienceType: row.audienceType,
    };

    if (row.role) {
      audience.role = row.role;
    }

    if (typeof row.schoolYear === 'number') {
      audience.schoolYear = row.schoolYear;
    }

    if (typeof row.grade === 'number') {
      audience.grade = row.grade;
    }

    if (row.section) {
      audience.section = row.section;
    }

    if (row.shift) {
      audience.shift = row.shift;
    }

    if (row.studentId) {
      audience.studentId = row.studentId;
    }

    payload.push(audience);
  }

  return payload;
}

function buildPayload() {
  if (!form.title.trim() || !form.summary.trim() || !form.body.trim()) {
    feedback.value = {
      type: 'warning',
      title: 'Datos incompletos',
      message: 'Completa título, resumen y cuerpo del comunicado.',
    };
    return null;
  }

  const audiences = buildAudiencePayload();

  if (!audiences) {
    return null;
  }

  const links = linkRows.value
    .filter((row) => row.label.trim() || row.url.trim())
    .map((row, index) => ({
      label: row.label.trim(),
      url: row.url.trim(),
      sortOrder: index,
    }));

  if (links.some((link) => !link.label || !link.url)) {
    feedback.value = {
      type: 'warning',
      title: 'Enlaces incompletos',
      message: 'Cada enlace debe tener texto y URL.',
    };
    return null;
  }

  const payload: CreateAnnouncementPayload = {
    title: form.title.trim(),
    summary: form.summary.trim(),
    body: form.body.trim(),
    type: form.type,
    priority: form.priority,
    isPinned: form.isPinned,
    links,
    audiences,
  };

  const scheduledAt = fromDateTimeLocalInput(form.scheduledAt);
  const visibleFrom = fromDateTimeLocalInput(form.visibleFrom);
  const visibleUntil = fromDateTimeLocalInput(form.visibleUntil);

  if (scheduledAt) {
    payload.scheduledAt = scheduledAt;
  }

  if (visibleFrom) {
    payload.visibleFrom = visibleFrom;
  }

  if (visibleUntil) {
    payload.visibleUntil = visibleUntil;
  }

  return payload;
}

async function persistDraft(): Promise<AnnouncementAdminDetail | null> {
  const payload = buildPayload();

  if (!payload) {
    return null;
  }

  if (isEditing.value) {
    return updateAnnouncement(String(route.params.id), payload);
  }

  return createAnnouncement(payload);
}

async function handleSaveDraft(): Promise<void> {
  feedback.value = null;
  isSaving.value = true;

  try {
    const detail = await persistDraft();

    if (!detail) {
      return;
    }

    hydrateForm(detail);

    if (!isEditing.value) {
      await router.replace(`/portal/comunicados/${detail.id}/editar`);
    }

    feedback.value = {
      type: 'success',
      title: 'Borrador guardado',
      message: 'El comunicado quedó guardado correctamente.',
    };
  } catch (error) {
    feedback.value = {
      type: 'error',
      title: 'No se pudo guardar el comunicado',
      message: getApiErrorMessage(error),
    };
  } finally {
    isSaving.value = false;
  }
}

async function handlePublish(): Promise<void> {
  feedback.value = null;
  isPublishing.value = true;

  try {
    let detail = announcementDetail.value;

    if (!detail || detail.canEdit) {
      detail = await persistDraft();

      if (!detail) {
        return;
      }

      if (!isEditing.value) {
        await router.replace(`/portal/comunicados/${detail.id}/editar`);
      }
    }

    const publishedDetail = await publishAnnouncement(detail.id);
    hydrateForm(publishedDetail);
    feedback.value = {
      type: 'success',
      title:
        publishedDetail.status === 'scheduled'
          ? 'Comunicado programado'
          : 'Comunicado publicado',
      message:
        publishedDetail.status === 'scheduled'
          ? 'El comunicado quedó programado para publicarse en la fecha indicada.'
          : 'El comunicado ya está visible para su audiencia.',
    };
  } catch (error) {
    feedback.value = {
      type: 'error',
      title: 'No se pudo publicar el comunicado',
      message: getApiErrorMessage(error),
    };
  } finally {
    isPublishing.value = false;
  }
}

async function handleArchive(): Promise<void> {
  if (!announcementDetail.value) {
    return;
  }

  const confirmed = window.confirm(
    'El comunicado dejará de mostrarse en el feed normal. ¿Deseas archivarlo?',
  );

  if (!confirmed) {
    return;
  }

  feedback.value = null;
  isArchiving.value = true;

  try {
    const archivedDetail = await archiveAnnouncement(announcementDetail.value.id);
    hydrateForm(archivedDetail);
    feedback.value = {
      type: 'success',
      title: 'Comunicado archivado',
      message: 'El comunicado se archivó correctamente.',
    };
  } catch (error) {
    feedback.value = {
      type: 'error',
      title: 'No se pudo archivar el comunicado',
      message: getApiErrorMessage(error),
    };
  } finally {
    isArchiving.value = false;
  }
}

async function handleDelete(): Promise<void> {
  if (!announcementDetail.value) {
    return;
  }

  const confirmed = window.confirm(
    'Solo se eliminan borradores o programados no publicados. Esta acción no se puede deshacer. ¿Deseas continuar?',
  );

  if (!confirmed) {
    return;
  }

  feedback.value = null;
  isDeleting.value = true;

  try {
    await deleteAnnouncement(announcementDetail.value.id);
    feedback.value = {
      type: 'success',
      title: 'Comunicado eliminado',
      message: 'El comunicado se eliminó correctamente.',
    };
    await router.push('/portal/comunicados');
  } catch (error) {
    feedback.value = {
      type: 'error',
      title: 'No se pudo eliminar el comunicado',
      message: getApiErrorMessage(error),
    };
  } finally {
    isDeleting.value = false;
  }
}

async function loadAnnouncementDetail(): Promise<void> {
  if (!isEditing.value) {
    audienceRows.value = [
      {
        id: generateRowId(),
        audienceType: 'all',
        schoolYear: currentSchoolYear.value,
        role: null,
        grade: null,
        section: null,
        shift: null,
        studentId: null,
        studentCode: null,
        studentLabel: null,
        isResolving: false,
      },
    ];
    return;
  }

  isLoading.value = true;

  try {
    const detail = await getAdminAnnouncementDetail(String(route.params.id));
    hydrateForm(detail);
  } catch (error) {
    feedback.value = {
      type: 'error',
      title: 'No se pudo cargar el comunicado',
      message: getApiErrorMessage(error),
    };
  } finally {
    isLoading.value = false;
  }
}

onMounted(async () => {
  try {
    await institutionStore.loadSettings();
  } catch (error) {
    feedback.value = {
      type: 'error',
      title: 'No se pudo cargar la configuración institucional',
      message: getApiErrorMessage(error),
    };
  }

  await loadAnnouncementDetail();
});
</script>
