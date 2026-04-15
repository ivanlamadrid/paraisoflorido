<template>
  <q-page class="announcements-page">
    <div class="ui-page-shell">
      <div class="row items-center q-col-gutter-sm q-mb-lg">
        <div class="col-auto">
          <q-btn
            flat
            color="primary"
            icon="arrow_back"
            label="Volver a comunicados"
            no-caps
            @click="router.push('/tutor/comunicados')"
          />
        </div>
      </div>

      <PageIntroCard
        eyebrow="Comunicados de tutoría"
        :title="isEditing ? 'Editar comunicado' : 'Nuevo comunicado'"
        description="Crea comunicados dirigidos solo a tus secciones asignadas y mantenlos dentro de tu alcance tutorial."
      >
        <template #meta>
          <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="groups">
            {{ tutorAssignments.length }} secciones disponibles
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

      <div
        v-else-if="tutorAssignments.length === 0"
        class="announcement-empty-state q-mt-lg"
      >
        <q-icon name="groups" size="34px" color="grey-6" />
        <div class="text-subtitle2 text-weight-bold">Sin secciones asignadas</div>
        <p class="text-body2 text-grey-7 q-mb-none">
          Dirección debe asignarte al menos una sección antes de enviar comunicados tutoriales.
        </p>
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
                  Para el caso simple, completa el contenido y elige una o más secciones asignadas.
                  Usa <span class="text-weight-bold">{{ publishActionLabel }}</span> cuando esté listo.
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
                  Secciones asignadas al tutor
                </div>
                <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                  Cada comunicado tutorial solo puede dirigirse a una o más de tus secciones asignadas.
                </p>
              </div>
              <div class="col-12 col-lg-auto">
                <q-btn
                  flat
                  color="primary"
                  icon="add"
                  label="Agregar sección"
                  no-caps
                  :disable="audienceRows.length >= tutorAssignments.length"
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
                    <div class="col-12 col-lg-10">
                      <q-select
                        v-model="row.assignmentKey"
                        label="Sección asignada"
                        outlined
                        emit-value
                        map-options
                        :options="availableAssignmentOptions(row.id)"
                      >
                        <template #prepend>
                          <q-icon name="groups" />
                        </template>
                      </q-select>
                    </div>

                    <div class="col-12 col-lg-2 row items-center justify-end">
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
                  <q-input v-model="row.label" label="Texto del enlace" outlined maxlength="120" />
                </div>
                <div class="col-12 col-md-7">
                  <q-input v-model="row.url" label="URL" outlined maxlength="500" />
                </div>
                <div class="col-12 col-md-1 row items-center justify-end">
                  <q-btn flat round color="negative" icon="close" @click="removeLinkRow(row.id)" />
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
import { getMyTutorAssignmentsCached } from 'src/services/api/users-api';
import { useInstitutionStore } from 'src/stores/institution-store';
import type {
  AnnouncementAdminDetail,
  AnnouncementAudienceInput,
  AnnouncementPriority,
  AnnouncementType,
  CreateAnnouncementPayload,
} from 'src/types/announcements';
import type { TutorAssignmentSummary } from 'src/types/users';
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
  assignmentKey: string | null;
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
const tutorAssignments = ref<TutorAssignmentSummary[]>([]);

const form = reactive({
  title: '',
  summary: '',
  body: '',
  type: 'attendance' as AnnouncementType,
  priority: 'normal' as AnnouncementPriority,
  isPinned: false,
  scheduledAt: '',
  visibleFrom: '',
  visibleUntil: '',
});

const linkRows = ref<LinkRow[]>([]);
const audienceRows = ref<AudienceRow[]>([]);

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
    .map((row) => formatAudiencePreviewLabel(row))
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

const tutorAssignmentOptions = computed(() =>
  tutorAssignments.value.map((assignment) => ({
    label: formatAssignmentLabel(assignment),
    value: getAssignmentKey(assignment),
  })),
);

function generateRowId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function getAssignmentKey(assignment: TutorAssignmentSummary): string {
  return [assignment.schoolYear, assignment.grade, assignment.section, assignment.shift].join(':');
}

function formatAssignmentLabel(assignment: TutorAssignmentSummary): string {
  return `${assignment.grade} ${assignment.section} · ${
    assignment.shift === 'morning' ? 'Mañana' : 'Tarde'
  } · ${assignment.schoolYear}`;
}

function findAssignmentByKey(key: string | null): TutorAssignmentSummary | null {
  if (!key) {
    return null;
  }

  return tutorAssignments.value.find((assignment) => getAssignmentKey(assignment) === key) ?? null;
}

function availableAssignmentOptions(currentRowId: string) {
  const reservedKeys = new Set(
    audienceRows.value
      .filter((row) => row.id !== currentRowId)
      .map((row) => row.assignmentKey)
      .filter((key): key is string => Boolean(key)),
  );

  return tutorAssignmentOptions.value.filter((option) => !reservedKeys.has(option.value));
}

function formatAudiencePreviewLabel(row: AudienceRow): string | null {
  const assignment = findAssignmentByKey(row.assignmentKey);

  if (!assignment) {
    return null;
  }

  return `${assignment.grade} ${assignment.section} · ${getShiftLabel(assignment.shift)} · ${assignment.schoolYear}`;
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

function addAudienceRow(assignmentKey?: string): void {
  const usedKeys = new Set(
    audienceRows.value
      .map((row) => row.assignmentKey)
      .filter((key): key is string => Boolean(key)),
  );

  audienceRows.value.push({
    id: generateRowId(),
    assignmentKey:
      assignmentKey ??
      tutorAssignments.value
        .map((assignment) => getAssignmentKey(assignment))
        .find((key) => !usedKeys.has(key)) ??
      null,
  });
}

function removeAudienceRow(rowId: string): void {
  audienceRows.value = audienceRows.value.filter((row) => row.id !== rowId);
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
    assignmentKey:
      tutorAssignments.value.find(
        (assignment) =>
          assignment.schoolYear === audience.schoolYear &&
          assignment.grade === audience.grade &&
          assignment.section === audience.section &&
          assignment.shift === audience.shift,
      )
        ? [
            audience.schoolYear,
            audience.grade,
            audience.section,
            audience.shift,
          ].join(':')
        : null,
  }));
}

function buildAudiencePayload(): AnnouncementAudienceInput[] | null {
  if (audienceRows.value.length === 0) {
    feedback.value = {
      type: 'warning',
      title: 'Audiencia requerida',
      message: 'Agrega al menos una sección asignada para publicar el comunicado.',
    };
    return null;
  }

  const audiences: AnnouncementAudienceInput[] = [];

  for (const row of audienceRows.value) {
    const assignment = findAssignmentByKey(row.assignmentKey);

    if (!assignment) {
      feedback.value = {
        type: 'warning',
        title: 'Sección pendiente',
        message: 'Selecciona una sección válida en cada segmento de audiencia.',
      };
      return null;
    }

    audiences.push({
      audienceType: 'student_classroom',
      schoolYear: assignment.schoolYear,
      grade: assignment.grade,
      section: assignment.section,
      shift: assignment.shift,
    });
  }

  return audiences;
}

function buildPayload(): CreateAnnouncementPayload | null {
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
      await router.replace(`/tutor/comunicados/${detail.id}/editar`);
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
        await router.replace(`/tutor/comunicados/${detail.id}/editar`);
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
          : 'El comunicado ya está visible para tus secciones seleccionadas.',
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
    await router.push('/tutor/comunicados');
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

async function loadTutorContext(): Promise<void> {
  tutorAssignments.value = await getMyTutorAssignmentsCached();
}

async function loadAnnouncementDetail(): Promise<void> {
  if (!isEditing.value) {
    audienceRows.value = [];

    const firstAssignment = tutorAssignments.value[0];

    if (firstAssignment) {
      addAudienceRow(getAssignmentKey(firstAssignment));
    }

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
    await loadTutorContext();
  } catch (error) {
    feedback.value = {
      type: 'error',
      title: 'No se pudo cargar el contexto tutorial',
      message: getApiErrorMessage(error),
    };
  }

  await loadAnnouncementDetail();
});
</script>
