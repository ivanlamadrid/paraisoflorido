<template>
  <div v-if="mark" class="attendance-mark-badge">
    <q-chip
      dense
      square
      class="attendance-mark-badge__time"
      :color="statusTone.color"
      :text-color="statusTone.textColor"
    >
      {{ formattedTime }}
    </q-chip>
    <q-chip
      v-if="mark.status !== 'regular'"
      dense
      square
      class="attendance-mark-badge__status"
      :color="statusTone.color"
      :text-color="statusTone.textColor"
    >
      {{ statusLabel }}
    </q-chip>
    <div class="attendance-mark-badge__source">
      {{ mark.source === 'qr' ? 'QR' : 'Manual' }}
    </div>
    <div v-if="mark.observation" class="attendance-mark-badge__note">
      {{ mark.observation }}
    </div>
  </div>

  <span v-else class="attendance-mark-badge__empty">
    {{ emptyLabel }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DailyAttendanceMark } from 'src/types/attendance';
import {
  getAttendanceRecordStatusLabel,
  getAttendanceRecordStatusTone,
} from 'src/utils/attendance-status';

const props = defineProps<{
  mark: DailyAttendanceMark | null;
  emptyLabel: string;
}>();

const formattedTime = computed(() => {
  if (!props.mark) {
    return '';
  }

  return new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Lima',
  }).format(new Date(props.mark.markedAt));
});

const statusLabel = computed(() => {
  if (!props.mark) {
    return '';
  }

  return getAttendanceRecordStatusLabel(props.mark.status);
});

const statusTone = computed(() => {
  if (!props.mark) {
    return {
      color: 'green-1',
      textColor: 'positive',
    };
  }

  return getAttendanceRecordStatusTone(props.mark.status);
});
</script>
