<template>
  <q-page class="announcements-page">
    <div class="ui-page-shell">
      <PageIntroCard
        eyebrow="Gestión de comunicados"
        title="Comunicados institucionales"
        description="Crea, publica, programa y administra comunicados del colegio desde una superficie pensada para revisar su estado, alcance y autoría."
      >
        <template #meta>
          <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="event_note">
            {{ response.total }} comunicados
          </q-chip>
        </template>

        <template #actions>
          <div class="row q-gutter-sm">
            <q-btn
              flat
              color="primary"
              icon="visibility"
              label="Ver feed"
              no-caps
              @click="router.push('/comunicados')"
            />
            <q-btn
              color="primary"
              icon="add"
              label="Nuevo comunicado"
              no-caps
              @click="router.push(`${managementBasePath}/nuevo`)"
            />
          </div>
        </template>
      </PageIntroCard>

      <StatusBanner
        v-if="feedback"
        class="q-mt-lg"
        :variant="feedback.type"
        :title="feedback.title"
        :message="feedback.message"
      />

      <q-card flat bordered class="announcements-filter-card q-mt-lg">
        <q-card-section class="ui-card-body">
          <div class="ui-eyebrow">Filtros</div>
          <div class="text-subtitle1 text-weight-bold q-mt-sm">
            Organiza el listado administrativo
          </div>
          <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
            Los borradores y programados pueden eliminarse. Los publicados se mantienen trazables mediante archivado.
          </p>

          <div class="row q-col-gutter-lg q-mt-lg">
            <div class="col-12 col-lg-4">
              <q-input
                v-model="filters.search"
                label="Buscar por título o resumen"
                outlined
                maxlength="120"
              >
                <template #prepend>
                  <q-icon name="search" />
                </template>
              </q-input>
            </div>
            <div class="col-12 col-sm-6 col-lg-2">
              <q-select
                v-model="filters.status"
                label="Estado"
                outlined
                clearable
                emit-value
                map-options
                :options="statusOptions"
              >
                <template #prepend>
                  <q-icon name="toggle_on" />
                </template>
              </q-select>
            </div>
            <div class="col-12 col-sm-6 col-lg-2">
              <q-select
                v-model="filters.priority"
                label="Prioridad"
                outlined
                clearable
                emit-value
                map-options
                :options="priorityOptions"
              >
                <template #prepend>
                  <q-icon name="priority_high" />
                </template>
              </q-select>
            </div>
            <div class="col-12 col-sm-6 col-lg-2">
              <q-select
                v-model="filters.type"
                label="Categoría"
                outlined
                clearable
                emit-value
                map-options
                :options="typeOptions"
              >
                <template #prepend>
                  <q-icon name="category" />
                </template>
              </q-select>
            </div>
            <div class="col-12 col-sm-6 col-lg-2">
              <q-select
                v-model="pagination.limit"
                label="Por página"
                outlined
                emit-value
                map-options
                :options="pageSizeOptions"
              >
                <template #prepend>
                  <q-icon name="view_list" />
                </template>
              </q-select>
            </div>
            <div class="col-12 col-sm-6 col-lg-2 row items-center justify-end">
              <q-btn
                flat
                color="primary"
                label="Limpiar"
                no-caps
                @click="resetFilters"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>

      <div v-if="isLoading" class="ui-loading-state q-mt-lg">
        <q-spinner color="primary" size="34px" />
        <span class="text-body2 text-grey-7">Cargando comunicados...</span>
      </div>

      <div v-else-if="response.items.length === 0" class="announcement-empty-state q-mt-lg">
        <q-icon name="drafts" size="34px" color="grey-6" />
        <div class="text-subtitle2 text-weight-bold">Sin comunicados todavía</div>
        <p class="text-body2 text-grey-7 q-mb-none">
          Crea el primer comunicado para empezar a usar este módulo.
        </p>
      </div>

      <div v-else class="announcements-list q-mt-lg">
        <q-card
          v-for="item in response.items"
          :key="item.id"
          flat
          bordered
          class="announcement-card announcement-card--admin"
        >
          <q-card-section class="ui-card-body">
            <div class="announcement-card__meta-row">
              <div class="row q-gutter-sm">
                <q-chip
                  dense
                  class="ui-stat-chip"
                  :color="getAnnouncementStatusTone(item.status).color"
                  :text-color="getAnnouncementStatusTone(item.status).textColor"
                  :icon="getAnnouncementStatusTone(item.status).icon"
                >
                  {{ getAnnouncementStatusLabel(item.status) }}
                </q-chip>
                <q-chip
                  dense
                  class="ui-stat-chip"
                  :color="getAnnouncementPriorityTone(item.priority).color"
                  :text-color="getAnnouncementPriorityTone(item.priority).textColor"
                  :icon="getAnnouncementPriorityTone(item.priority).icon"
                >
                  {{ getAnnouncementPriorityLabel(item.priority) }}
                </q-chip>
                <q-chip
                  dense
                  class="ui-stat-chip"
                  :color="getAnnouncementTypeTone(item.type).color"
                  :text-color="getAnnouncementTypeTone(item.type).textColor"
                  :icon="getAnnouncementTypeTone(item.type).icon"
                >
                  {{ getAnnouncementTypeLabel(item.type) }}
                </q-chip>
                <q-chip
                  v-if="item.isPinned"
                  dense
                  class="ui-stat-chip"
                  color="amber-1"
                  text-color="amber-10"
                  icon="push_pin"
                >
                  Fijado
                </q-chip>
              </div>

              <q-chip dense class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="visibility">
                {{ item.readCount }} lecturas
              </q-chip>
            </div>

            <div class="announcement-card__title q-mt-md">
              {{ item.title }}
            </div>
            <p class="announcement-card__summary q-mt-sm">
              {{ item.summary }}
            </p>

            <div class="announcement-admin-card__details q-mt-md">
              <div class="announcement-admin-card__detail">
                <span class="announcement-admin-card__detail-label">Creado por</span>
                <span class="announcement-admin-card__detail-value">
                  {{ item.createdByDisplayName }}
                </span>
              </div>
              <div class="announcement-admin-card__detail">
                <span class="announcement-admin-card__detail-label">Creado</span>
                <span class="announcement-admin-card__detail-value">
                  {{ formatAnnouncementDate(item.createdAt) }}
                </span>
              </div>
              <div class="announcement-admin-card__detail">
                <span class="announcement-admin-card__detail-label">{{ getRelevantDateLabel(item.status) }}</span>
                <span class="announcement-admin-card__detail-value">
                  {{ formatAnnouncementDate(getRelevantDateValue(item)) }}
                </span>
              </div>
              <div
                v-if="item.publishedByDisplayName || item.archivedByDisplayName"
                class="announcement-admin-card__detail"
              >
                <span class="announcement-admin-card__detail-label">
                  {{ item.status === 'archived' ? 'Archivado por' : 'Publicado por' }}
                </span>
                <span class="announcement-admin-card__detail-value">
                  {{ item.status === 'archived' ? item.archivedByDisplayName : item.publishedByDisplayName }}
                </span>
              </div>
            </div>

            <div class="announcement-admin-card__audiences">
              <q-chip
                v-for="audience in item.audienceSummary.slice(0, 4)"
                :key="`${item.id}-${audience}`"
                dense
                class="ui-stat-chip"
                color="grey-2"
                text-color="grey-8"
                icon="groups"
              >
                {{ audience }}
              </q-chip>
              <q-chip
                v-if="item.audienceSummary.length > 4"
                dense
                class="ui-stat-chip"
                color="grey-2"
                text-color="grey-8"
                icon="add"
              >
                +{{ item.audienceSummary.length - 4 }} más
              </q-chip>
            </div>

            <div class="announcement-card__footer q-mt-lg">
              <div class="announcement-card__dates">
                <span>{{ getVisibilitySummary(item) }}</span>
              </div>

              <div class="row q-gutter-sm">
                <q-btn
                  flat
                  color="primary"
                  icon="edit"
                  label="Editar"
                  no-caps
                  :disable="!canEdit(item.status)"
                  @click="router.push(`${managementBasePath}/${item.id}/editar`)"
                />
                <q-btn
                  v-if="item.status === 'draft'"
                  flat
                  color="secondary"
                  icon="publish"
                  label="Publicar"
                  no-caps
                  @click="handlePublish(item.id)"
                />
                <q-btn
                  v-if="item.status === 'published'"
                  flat
                  color="negative"
                  icon="archive"
                  label="Archivar"
                  no-caps
                  @click="handleArchive(item.id)"
                />
                <q-btn
                  v-if="['draft', 'scheduled'].includes(item.status)"
                  flat
                  color="negative"
                  icon="delete"
                  label="Eliminar"
                  no-caps
                  @click="handleDelete(item.id)"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div v-if="response.total > response.limit" class="row justify-center q-mt-lg">
        <q-pagination
          v-model="pagination.page"
          color="primary"
          :max="Math.max(1, Math.ceil(response.total / response.limit))"
          max-pages="7"
          boundary-links
        />
      </div>

      <div v-if="response.total > 0" class="row justify-center q-mt-sm text-caption text-grey-7">
        {{ paginationSummary }}
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import PageIntroCard from 'components/ui/PageIntroCard.vue';
import StatusBanner from 'components/ui/StatusBanner.vue';
import { getApiErrorMessage } from 'src/services/api/api-errors';
import {
  archiveAnnouncement,
  deleteAnnouncement,
  getAdminAnnouncements,
  publishAnnouncement,
} from 'src/services/api/announcements-api';
import { useSessionStore } from 'src/stores/session-store';
import type {
  AnnouncementAdminListResponse,
  AnnouncementPriority,
  AnnouncementStatus,
  AnnouncementType,
} from 'src/types/announcements';
import {
  announcementPriorityOptions,
  announcementStatusOptions,
  announcementTypeOptions,
  formatAnnouncementDate,
  getAnnouncementPriorityLabel,
  getAnnouncementPriorityTone,
  getAnnouncementStatusLabel,
  getAnnouncementStatusTone,
  getAnnouncementTypeLabel,
  getAnnouncementTypeTone,
} from 'src/utils/announcements';

type FeedbackState = {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
};

const router = useRouter();
const sessionStore = useSessionStore();

const isLoading = ref(false);
const feedback = ref<FeedbackState | null>(null);
const response = ref<AnnouncementAdminListResponse>({
  items: [],
  total: 0,
  page: 1,
  limit: 12,
});

const pagination = reactive({
  page: 1,
  limit: 12,
});

const filters = reactive<{
  search: string;
  status: AnnouncementStatus | null;
  priority: AnnouncementPriority | null;
  type: AnnouncementType | null;
}>({
  search: '',
  status: null,
  priority: null,
  type: null,
});

const statusOptions = announcementStatusOptions;
const priorityOptions = announcementPriorityOptions;
const typeOptions = announcementTypeOptions;
const pageSizeOptions = [
  { label: '12', value: 12 },
  { label: '24', value: 24 },
  { label: '48', value: 48 },
] as const;

const managementBasePath = computed(() =>
  sessionStore.user?.role === 'tutor' ? '/tutor/comunicados' : '/portal/comunicados',
);

function canEdit(status: AnnouncementStatus): boolean {
  return ['draft', 'scheduled'].includes(status);
}

const paginationSummary = computed(() => {
  if (response.value.total === 0) {
    return '';
  }

  const start = (response.value.page - 1) * response.value.limit + 1;
  const end = Math.min(
    response.value.total,
    start + response.value.items.length - 1,
  );

  return `Mostrando ${start}-${end} de ${response.value.total} comunicados.`;
});

function getRelevantDateLabel(status: AnnouncementStatus): string {
  if (status === 'scheduled') {
    return 'Programado para';
  }

  if (status === 'published') {
    return 'Publicado';
  }

  if (status === 'archived') {
    return 'Archivado';
  }

  return 'Actualizado';
}

function getRelevantDateValue(item: AnnouncementAdminListResponse['items'][number]): string | null {
  if (item.status === 'scheduled') {
    return item.scheduledAt;
  }

  if (item.status === 'published') {
    return item.publishedAt ?? item.updatedAt;
  }

  if (item.status === 'archived') {
    return item.archivedAt ?? item.updatedAt;
  }

  return item.updatedAt;
}

function getVisibilitySummary(item: AnnouncementAdminListResponse['items'][number]): string {
  if (item.visibleFrom || item.visibleUntil) {
    const from = item.visibleFrom
      ? formatAnnouncementDate(item.visibleFrom)
      : 'inmediatamente';
    const until = item.visibleUntil
      ? formatAnnouncementDate(item.visibleUntil)
      : 'sin cierre';

    return `Visible desde ${from} hasta ${until}.`;
  }

  if (item.status === 'archived') {
    return 'Fuera del feed normal por archivado.';
  }

  return 'Visible con la configuración vigente del comunicado.';
}

async function loadAnnouncements(): Promise<void> {
  feedback.value = null;
  isLoading.value = true;

  try {
    const query: {
      page: number;
      limit: number;
      search?: string;
      status?: AnnouncementStatus;
      priority?: AnnouncementPriority;
      type?: AnnouncementType;
    } = {
      page: pagination.page,
      limit: pagination.limit,
    };

    if (filters.search.trim()) {
      query.search = filters.search.trim();
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.priority) {
      query.priority = filters.priority;
    }

    if (filters.type) {
      query.type = filters.type;
    }

    response.value = await getAdminAnnouncements(query);
    pagination.page = response.value.page;
    pagination.limit = response.value.limit;
  } catch (error) {
    response.value = {
      items: [],
      total: 0,
      page: pagination.page,
      limit: pagination.limit,
    };
    feedback.value = {
      type: 'error',
      title: 'No se pudo cargar la gestión de comunicados',
      message: getApiErrorMessage(error),
    };
  } finally {
    isLoading.value = false;
  }
}

async function handlePublish(announcementId: string): Promise<void> {
  const confirmed = window.confirm(
    'Se publicará o programará este comunicado según la configuración guardada. ¿Deseas continuar?',
  );

  if (!confirmed) {
    return;
  }

  try {
    await publishAnnouncement(announcementId);
    feedback.value = {
      type: 'success',
      title: 'Comunicado actualizado',
      message:
        'El comunicado quedó publicado o programado según la fecha definida.',
    };
    await loadAnnouncements();
  } catch (error) {
    feedback.value = {
      type: 'error',
      title: 'No se pudo publicar el comunicado',
      message: getApiErrorMessage(error),
    };
  }
}

async function handleArchive(announcementId: string): Promise<void> {
  const confirmed = window.confirm(
    'El comunicado saldrá del feed normal. ¿Deseas archivarlo?',
  );

  if (!confirmed) {
    return;
  }

  try {
    await archiveAnnouncement(announcementId);
    feedback.value = {
      type: 'success',
      title: 'Comunicado archivado',
      message: 'El comunicado se archivó correctamente.',
    };
    await loadAnnouncements();
  } catch (error) {
    feedback.value = {
      type: 'error',
      title: 'No se pudo archivar el comunicado',
      message: getApiErrorMessage(error),
    };
  }
}

async function handleDelete(announcementId: string): Promise<void> {
  const confirmed = window.confirm(
    'Solo se pueden eliminar borradores o programados que aún no se hayan publicado. ¿Deseas continuar?',
  );

  if (!confirmed) {
    return;
  }

  try {
    await deleteAnnouncement(announcementId);
    feedback.value = {
      type: 'success',
      title: 'Comunicado eliminado',
      message: 'El borrador o programado se eliminó correctamente.',
    };
    await loadAnnouncements();
  } catch (error) {
    feedback.value = {
      type: 'error',
      title: 'No se pudo eliminar el comunicado',
      message: getApiErrorMessage(error),
    };
  }
}

function resetFilters(): void {
  filters.search = '';
  filters.status = null;
  filters.priority = null;
  filters.type = null;
  pagination.page = 1;
}

watch(
  () => [
    pagination.page,
    pagination.limit,
    filters.search,
    filters.status,
    filters.priority,
    filters.type,
  ],
  () => {
    void loadAnnouncements();
  },
);

watch(
  () => [filters.search, filters.status, filters.priority, filters.type],
  () => {
    pagination.page = 1;
  },
);

onMounted(async () => {
  await loadAnnouncements();
});
</script>
