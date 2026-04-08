<template>
  <q-dialog :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)">
    <q-card class="announcement-preview-dialog">
      <q-card-section class="row items-start justify-between q-col-gutter-md">
        <div class="col">
          <div class="ui-eyebrow">Vista previa</div>
          <div class="text-subtitle1 text-weight-bold q-mt-sm">
            Así se verá el comunicado
          </div>
          <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
            Verifica contenido, prioridad, enlaces y audiencia antes de guardar o publicar.
          </p>
        </div>
        <div class="col-auto">
          <q-btn flat round dense icon="close" @click="emit('update:modelValue', false)" />
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section class="q-gutter-lg">
        <div class="row q-gutter-sm">
          <q-chip
            dense
            class="ui-stat-chip"
            :color="getAnnouncementTypeTone(type).color"
            :text-color="getAnnouncementTypeTone(type).textColor"
            :icon="getAnnouncementTypeTone(type).icon"
          >
            {{ getAnnouncementTypeLabel(type) }}
          </q-chip>
          <q-chip
            dense
            class="ui-stat-chip"
            :color="getAnnouncementPriorityTone(priority).color"
            :text-color="getAnnouncementPriorityTone(priority).textColor"
            :icon="getAnnouncementPriorityTone(priority).icon"
          >
            {{ getAnnouncementPriorityLabel(priority) }}
          </q-chip>
          <q-chip
            v-if="isPinned"
            dense
            class="ui-stat-chip"
            color="amber-1"
            text-color="amber-10"
            icon="push_pin"
          >
            Fijado
          </q-chip>
        </div>

        <div>
          <div class="text-h6 text-weight-bold">
            {{ title || 'Sin título todavía' }}
          </div>
          <p class="text-body1 text-grey-8 q-mt-sm q-mb-none">
            {{ summary || 'Agrega un resumen corto para orientar a la audiencia.' }}
          </p>
        </div>

        <q-card flat bordered class="bg-grey-1">
          <q-card-section>
            <div class="text-caption text-grey-7 text-uppercase text-weight-bold">
              Contenido
            </div>
            <div class="text-body1 q-mt-sm announcement-preview-dialog__body">
              {{ body || 'Todavía no hay contenido para mostrar en la vista previa.' }}
            </div>
          </q-card-section>
        </q-card>

        <q-card flat bordered v-if="audienceLabels.length > 0">
          <q-card-section>
            <div class="text-caption text-grey-7 text-uppercase text-weight-bold">
              Audiencia
            </div>
            <div class="row q-gutter-sm q-mt-sm">
              <q-chip
                v-for="label in audienceLabels"
                :key="label"
                dense
                class="ui-stat-chip"
                color="grey-2"
                text-color="grey-8"
                icon="groups"
              >
                {{ label }}
              </q-chip>
            </div>
          </q-card-section>
        </q-card>

        <q-card flat bordered v-if="links.length > 0">
          <q-card-section>
            <div class="text-caption text-grey-7 text-uppercase text-weight-bold">
              Enlaces
            </div>
            <q-list separator class="q-mt-sm">
              <q-item v-for="(link, index) in links" :key="`${link.label}-${index}`">
                <q-item-section avatar>
                  <q-icon name="link" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ link.label }}</q-item-label>
                  <q-item-label caption>{{ link.url }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>

        <q-card flat bordered class="bg-grey-1">
          <q-card-section class="q-gutter-sm">
            <div class="text-caption text-grey-7 text-uppercase text-weight-bold">
              Visibilidad
            </div>
            <div class="text-body2">
              {{ visibilitySummary }}
            </div>
          </q-card-section>
        </q-card>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AnnouncementPriority, AnnouncementType } from 'src/types/announcements';
import {
  formatAnnouncementDate,
  getAnnouncementPriorityLabel,
  getAnnouncementPriorityTone,
  getAnnouncementTypeLabel,
  getAnnouncementTypeTone,
} from 'src/utils/announcements';

type PreviewLink = {
  label: string;
  url: string;
};

const props = defineProps<{
  modelValue: boolean;
  title: string;
  summary: string;
  body: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  isPinned: boolean;
  scheduledAt?: string | null;
  visibleFrom?: string | null;
  visibleUntil?: string | null;
  audienceLabels: string[];
  links: PreviewLink[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const visibilitySummary = computed(() => {
  const parts: string[] = [];

  if (props.scheduledAt) {
    parts.push(`Publicación programada para ${formatAnnouncementDate(props.scheduledAt)}`);
  } else {
    parts.push('Publicación inmediata');
  }

  if (props.visibleFrom) {
    parts.push(`visible desde ${formatAnnouncementDate(props.visibleFrom)}`);
  }

  if (props.visibleUntil) {
    parts.push(`visible hasta ${formatAnnouncementDate(props.visibleUntil)}`);
  }

  if (props.isPinned) {
    parts.push('marcado como fijado');
  }

  return parts.join(' · ');
});
</script>

<style scoped>
.announcement-preview-dialog {
  width: min(780px, 96vw);
  max-width: 96vw;
}

.announcement-preview-dialog__body {
  white-space: pre-wrap;
}
</style>
