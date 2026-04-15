<template>
  <q-page class="announcements-page">
    <div class="ui-page-shell">
      <PageIntroCard
        eyebrow="Comunicados"
        title="Información institucional"
        description="Revisa los comunicados que te corresponden, distingue lo pendiente por leer y abre el detalle cuando necesites contexto completo."
      >
        <template #meta>
          <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="mail">
            {{ feed.summary.unreadCount }} sin leer
          </q-chip>
          <q-chip class="ui-stat-chip" color="amber-1" text-color="amber-10" icon="push_pin">
            {{ feed.summary.pinnedCount }} destacados
          </q-chip>
          <q-chip class="ui-stat-chip" color="red-1" text-color="red-10" icon="priority_high">
            {{ feed.summary.urgentCount }} urgentes
          </q-chip>
        </template>

        <template #actions>
          <q-btn
            v-if="canManageAnnouncements"
            flat
            color="primary"
            icon="edit_note"
            label="Gestionar comunicados"
            no-caps
            @click="router.push(managementPath)"
          />
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
          <div class="row items-center justify-between q-col-gutter-lg">
            <div class="col-12 col-lg">
              <div class="ui-eyebrow">Feed</div>
              <div class="text-subtitle1 text-weight-bold q-mt-sm">
                Destacados y recientes
              </div>
              <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                Filtra solo si necesitas enfocarte en comunicados no leídos o en una categoría
                concreta.
              </p>
            </div>
            <div class="col-12 col-lg-auto">
              <q-btn-toggle
                v-model="filters.readState"
                unelevated
                no-caps
                spread
                toggle-color="primary"
                color="grey-2"
                text-color="grey-8"
                :options="readStateOptions"
              />
            </div>
          </div>

          <div class="row q-col-gutter-lg q-mt-md">
            <div class="col-12 col-md-4">
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
            <div class="col-12 col-md-4">
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
            <div class="col-12 col-md-4 row items-center justify-end">
              <q-btn
                flat
                color="primary"
                label="Limpiar filtros"
                no-caps
                @click="resetFilters"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>

      <section v-if="featuredAnnouncements.length > 0" class="q-mt-lg">
        <div class="announcements-section-header">
          <div>
            <div class="ui-eyebrow">Destacados</div>
            <div class="text-subtitle1 text-weight-bold q-mt-sm">
              Comunicados que conviene revisar primero
            </div>
          </div>
        </div>

        <div class="announcements-featured-grid q-mt-md">
          <q-card
            v-for="item in featuredAnnouncements"
            :key="`featured-${item.id}`"
            flat
            bordered
            class="announcement-card announcement-card--featured"
            @click="openAnnouncement(item.id)"
          >
            <q-card-section class="ui-card-body">
              <div class="announcement-card__meta-row">
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
                  color="grey-2"
                  text-color="grey-9"
                  icon="push_pin"
                >
                  {{ item.isPinned ? 'Fijado' : 'Reciente' }}
                </q-chip>
              </div>

              <div class="announcement-card__title q-mt-md">
                {{ item.title }}
              </div>
              <p class="announcement-card__summary q-mt-sm q-mb-none">
                {{ item.summary }}
              </p>

              <div class="announcement-card__footer q-mt-lg">
                <span>{{ formatAnnouncementDate(item.publishedAt) }}</span>
                <span>{{ item.isRead ? 'Leído' : 'Pendiente' }}</span>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </section>

      <section class="q-mt-xl">
        <div class="announcements-section-header">
          <div>
            <div class="ui-eyebrow">Recientes</div>
            <div class="text-subtitle1 text-weight-bold q-mt-sm">
              Feed completo
            </div>
          </div>
        </div>

        <div v-if="isLoading" class="ui-loading-state q-mt-lg">
          <q-spinner color="primary" size="34px" />
          <span class="text-body2 text-grey-7">Cargando comunicados...</span>
        </div>

        <div v-else-if="feed.items.length === 0" class="announcement-empty-state q-mt-lg">
          <q-icon name="mail_outline" size="34px" color="grey-6" />
          <div class="text-subtitle2 text-weight-bold">No hay comunicados para mostrar</div>
          <p class="text-body2 text-grey-7 q-mb-none">
            Cuando haya publicaciones para tu audiencia, aparecerán aquí.
          </p>
        </div>

        <div v-else class="announcements-list q-mt-lg">
          <q-card
            v-for="item in feed.items"
            :key="item.id"
            flat
            bordered
            class="announcement-card"
            :class="{ 'announcement-card--unread': !item.isRead }"
          >
            <q-card-section class="ui-card-body">
              <div class="announcement-card__meta-row">
                <div class="row q-gutter-sm">
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
                    dense
                    class="ui-stat-chip"
                    :color="getAnnouncementPriorityTone(item.priority).color"
                    :text-color="getAnnouncementPriorityTone(item.priority).textColor"
                    :icon="getAnnouncementPriorityTone(item.priority).icon"
                  >
                    {{ getAnnouncementPriorityLabel(item.priority) }}
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

                <div class="announcement-card__read-state">
                  <q-icon
                    :name="item.isRead ? 'done' : 'markunread'"
                    :color="item.isRead ? 'positive' : 'primary'"
                    size="18px"
                  />
                  <span>{{ item.isRead ? 'Leído' : 'No leído' }}</span>
                </div>
              </div>

              <div class="announcement-card__title q-mt-md">
                {{ item.title }}
              </div>
              <p class="announcement-card__summary q-mt-sm q-mb-none">
                {{ item.summary }}
              </p>

              <div class="announcement-card__footer q-mt-lg">
                <div class="row items-center q-gutter-sm text-grey-7">
                  <q-icon name="schedule" size="18px" />
                  <span>{{ formatAnnouncementDate(item.publishedAt) }}</span>
                </div>
                <q-btn
                  flat
                  color="primary"
                  icon="arrow_forward"
                  label="Abrir"
                  no-caps
                  @click="openAnnouncement(item.id)"
                />
              </div>
            </q-card-section>
          </q-card>
        </div>

        <div v-if="feed.total > feed.limit" class="row justify-center q-mt-lg">
          <q-pagination
            v-model="pagination.page"
            color="primary"
            :max="Math.max(1, Math.ceil(feed.total / feed.limit))"
            max-pages="7"
            boundary-links
          />
        </div>
      </section>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import PageIntroCard from 'components/ui/PageIntroCard.vue';
import StatusBanner from 'components/ui/StatusBanner.vue';
import { getApiErrorMessage } from 'src/services/api/api-errors';
import { getAnnouncementFeedCached } from 'src/services/api/announcements-api';
import { useSessionStore } from 'src/stores/session-store';
import { useStudentNotificationsStore } from 'src/stores/student-notifications-store';
import type {
  AnnouncementFeedResponse,
  AnnouncementPriority,
  AnnouncementReadState,
  AnnouncementType,
} from 'src/types/announcements';
import {
  announcementPriorityOptions,
  announcementReadStateOptions,
  announcementTypeOptions,
  formatAnnouncementDate,
  getAnnouncementPriorityLabel,
  getAnnouncementPriorityTone,
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
const studentNotificationsStore = useStudentNotificationsStore();

const isLoading = ref(false);
const feedback = ref<FeedbackState | null>(null);
const feed = ref<AnnouncementFeedResponse>({
  items: [],
  total: 0,
  page: 1,
  limit: 12,
  summary: {
    unreadCount: 0,
    pinnedCount: 0,
    urgentCount: 0,
  },
});

const pagination = reactive({
  page: 1,
});

const filters = reactive<{
  readState: AnnouncementReadState;
  type: AnnouncementType | null;
  priority: AnnouncementPriority | null;
}>({
  readState: 'all',
  type: null,
  priority: null,
});

const typeOptions = announcementTypeOptions;
const priorityOptions = announcementPriorityOptions;
const readStateOptions = announcementReadStateOptions;

const canManageAnnouncements = computed(() =>
  ['director', 'secretary', 'tutor'].includes(sessionStore.user?.role ?? ''),
);

const managementPath = computed(() =>
  sessionStore.user?.role === 'tutor'
    ? '/tutor/comunicados'
    : '/portal/comunicados',
);

const featuredAnnouncements = computed(() =>
  feed.value.items
    .filter((item) => item.isPinned || item.priority === 'urgent')
    .slice(0, 3),
);

async function loadFeed(): Promise<void> {
  feedback.value = null;
  isLoading.value = true;

  try {
    const query: {
      page: number;
      limit: number;
      readState: AnnouncementReadState;
      type?: AnnouncementType;
      priority?: AnnouncementPriority;
    } = {
      page: pagination.page,
      limit: 12,
      readState: filters.readState,
    };

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.priority) {
      query.priority = filters.priority;
    }

    feed.value = await getAnnouncementFeedCached(query);

    if (sessionStore.user?.role === 'student') {
      await studentNotificationsStore.refreshAnnouncements({ allowToast: false });
    }
  } catch (error) {
    feed.value = {
      items: [],
      total: 0,
      page: pagination.page,
      limit: 12,
      summary: {
        unreadCount: 0,
        pinnedCount: 0,
        urgentCount: 0,
      },
    };
    feedback.value = {
      type: 'error',
      title: 'No se pudieron cargar los comunicados',
      message: getApiErrorMessage(error),
    };
  } finally {
    isLoading.value = false;
  }
}

function resetFilters(): void {
  filters.readState = 'all';
  filters.type = null;
  filters.priority = null;
  pagination.page = 1;
}

function openAnnouncement(announcementId: string): void {
  void router.push(`/comunicados/${announcementId}`);
}

watch(
  () => [pagination.page, filters.readState, filters.type, filters.priority],
  () => {
    void loadFeed();
  },
);

watch(
  () => [filters.readState, filters.type, filters.priority],
  () => {
    pagination.page = 1;
  },
);

onMounted(async () => {
  await loadFeed();
});
</script>
