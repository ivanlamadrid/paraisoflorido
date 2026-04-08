<template>
  <q-card flat bordered class="ui-summary-card" :class="toneClass">
    <q-card-section class="ui-summary-card__body">
      <div class="ui-summary-card__header">
        <div class="ui-summary-card__label">{{ label }}</div>
        <q-icon v-if="icon" :name="icon" size="20px" />
      </div>

      <div class="ui-summary-card__value">{{ value }}</div>

      <p v-if="caption" class="ui-summary-card__caption q-mb-none">
        {{ caption }}
      </p>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  label: string;
  value: string | number;
  caption?: string;
  icon?: string;
  tone?: 'default' | 'primary' | 'positive' | 'warning' | 'dark' | 'info';
}>(), {
  caption: '',
  icon: '',
  tone: 'default',
});

const toneClass = computed(() => `ui-summary-card--${props.tone}`);
</script>
