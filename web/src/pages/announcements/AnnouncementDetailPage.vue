<template>
  <q-page class="announcements-page">
    <div class="ui-page-shell">
      <div class="row items-center q-col-gutter-sm q-mb-lg">
        <div class="col-auto">
          <q-btn
            flat
            color="primary"
            icon="arrow_back"
            label="Volver"
            no-caps
            @click="goBack"
          />
        </div>
      </div>

      <StatusBanner
        v-if="feedback"
        :variant="feedback.type"
        :title="feedback.title"
        :message="feedback.message"
      />

      <div v-if="isLoading" class="ui-loading-state">
        <q-spinner color="primary" size="34px" />
        <span class="text-body2 text-grey-7">Cargando comunicado...</span>
      </div>

      <template v-else-if="announcement">
        <PageIntroCard
          eyebrow="Detalle del comunicado"
          :title="announcement.title"
          :description="announcement.summary"
        >
          <template #meta>
            <q-chip
              class="ui-stat-chip"
              :color="getAnnouncementTypeTone(announcement.type).color"
              :text-color="getAnnouncementTypeTone(announcement.type).textColor"
              :icon="getAnnouncementTypeTone(announcement.type).icon"
            >
              {{ getAnnouncementTypeLabel(announcement.type) }}
            </q-chip>
            <q-chip
              class="ui-stat-chip"
              :color="getAnnouncementPriorityTone(announcement.priority).color"
              :text-color="getAnnouncementPriorityTone(announcement.priority).textColor"
              :icon="getAnnouncementPriorityTone(announcement.priority).icon"
            >
              {{ getAnnouncementPriorityLabel(announcement.priority) }}
            </q-chip>
            <q-chip
              class="ui-stat-chip"
              color="grey-2"
              text-color="grey-9"
              icon="schedule"
            >
              {{ formatAnnouncementDate(announcement.publishedAt) }}
            </q-chip>
            <q-chip
              v-if="announcement.isPinned"
              class="ui-stat-chip"
              color="amber-1"
              text-color="amber-10"
              icon="push_pin"
            >
              Fijado
            </q-chip>
          </template>
        </PageIntroCard>

        <q-card flat bordered class="announcement-detail-card q-mt-lg">
          <q-card-section class="ui-card-body">
            <div class="ui-eyebrow">Contenido</div>
            <div class="text-subtitle1 text-weight-bold q-mt-sm">
              Mensaje institucional
            </div>
            <div class="announcement-detail-card__body q-mt-lg">
              {{ announcement.body }}
            </div>
          </q-card-section>
        </q-card>

        <q-card
          v-if="announcement.links.length > 0"
          flat
          bordered
          class="announcement-detail-card q-mt-lg"
        >
          <q-card-section class="ui-card-body">
            <div class="ui-eyebrow">Enlaces</div>
            <div class="text-subtitle1 text-weight-bold q-mt-sm">
              Recursos relacionados
            </div>

            <q-list separator class="q-mt-lg">
              <q-item
                v-for="link in announcement.links"
                :key="link.id"
                clickable
                tag="a"
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
              >
                <q-item-section avatar>
                  <q-icon name="link" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ link.label }}</q-item-label>
                  <q-item-label caption>{{ link.url }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-icon name="open_in_new" color="grey-6" />
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageIntroCard from 'components/ui/PageIntroCard.vue';
import StatusBanner from 'components/ui/StatusBanner.vue';
import { getApiErrorMessage } from 'src/services/api/api-errors';
import {
  getAnnouncementDetail,
  markAnnouncementAsRead,
} from 'src/services/api/announcements-api';
import { useSessionStore } from 'src/stores/session-store';
import type { AnnouncementDetail } from 'src/types/announcements';
import {
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

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();

const announcement = ref<AnnouncementDetail | null>(null);
const feedback = ref<FeedbackState | null>(null);
const isLoading = ref(false);

async function loadAnnouncement(): Promise<void> {
  feedback.value = null;
  isLoading.value = true;

  try {
    const announcementId = String(route.params.id);
    announcement.value = await getAnnouncementDetail(announcementId);
    await markAnnouncementAsRead(announcementId);
  } catch (error) {
    announcement.value = null;
    feedback.value = {
      type: 'error',
      title: 'No se pudo abrir el comunicado',
      message: getApiErrorMessage(error),
    };
  } finally {
    isLoading.value = false;
  }
}

function goBack(): void {
  if (['director', 'secretary'].includes(sessionStore.user?.role ?? '')) {
    void router.push('/portal/comunicados');
    return;
  }

  void router.push('/comunicados');
}

onMounted(async () => {
  await loadAnnouncement();
});
</script>
