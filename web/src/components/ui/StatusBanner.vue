<template>
  <q-banner
    rounded
    class="ui-status-banner"
    :class="variantClass"
  >
    <template #avatar>
      <q-icon :name="iconName" />
    </template>
    <div class="ui-status-banner__content">
      <div v-if="title" class="ui-status-banner__title">{{ title }}</div>
      <div>{{ message }}</div>
    </div>
  </q-banner>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  message: string;
  title?: string;
  variant?: 'success' | 'error' | 'info' | 'warning';
}>();

const variantClass = computed(() => {
  if (props.variant === 'success') {
    return 'ui-status-banner--success';
  }

  if (props.variant === 'warning') {
    return 'ui-status-banner--warning';
  }

  if (props.variant === 'error') {
    return 'ui-status-banner--error';
  }

  return 'ui-status-banner--info';
});

const iconName = computed(() => {
  if (props.variant === 'success') {
    return 'check_circle';
  }

  if (props.variant === 'warning') {
    return 'warning';
  }

  if (props.variant === 'error') {
    return 'error';
  }

  return 'info';
});
</script>
