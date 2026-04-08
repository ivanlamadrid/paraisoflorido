<template>
  <div
    class="school-mark"
    :class="[
      `school-mark--${resolvedSize}`,
      { 'school-mark--emblem-only': !showText },
    ]"
  >
    <div class="school-mark__emblem" aria-hidden="true">
      <img
        class="school-mark__image"
        src="/branding/logo-pf.png"
        alt=""
      />
    </div>

    <div v-if="showText" class="school-mark__copy">
      <span class="school-mark__title">{{ schoolName }}</span>
      <span v-if="subtitle" class="school-mark__subtitle">{{ subtitle }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    compact?: boolean;
    showText?: boolean;
    schoolName?: string;
    subtitle?: string;
    size?: 'sm' | 'md' | 'lg';
  }>(),
  {
    compact: false,
    showText: true,
    schoolName: 'Colegio Paraíso Florido 3082',
    subtitle: 'Sistema institucional escolar',
  },
);

const resolvedSize = computed(() => props.size ?? (props.compact ? 'sm' : 'md'));
</script>
