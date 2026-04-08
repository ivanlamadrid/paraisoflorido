<template>
  <q-card flat bordered class="ui-surface ui-page-intro">
    <q-card-section class="ui-page-intro__header row items-start justify-between q-col-gutter-lg">
      <div class="col-12 col-lg">
        <div v-if="eyebrow" class="ui-eyebrow">
          {{ eyebrow }}
        </div>
        <div class="ui-page-title">
          {{ title }}
        </div>
        <p v-if="description" class="ui-page-description q-mt-sm q-mb-none">
          {{ description }}
        </p>
        <div v-if="$slots.meta" class="ui-page-meta q-mt-md">
          <slot name="meta" />
        </div>
      </div>

      <div v-if="$slots.actions" class="col-12 col-lg-auto">
        <div class="ui-page-actions">
          <slot name="actions" />
        </div>
      </div>
    </q-card-section>

    <q-separator v-if="$slots.default" />

    <q-card-section v-if="$slots.default" class="ui-card-body">
      <slot />
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
defineProps<{
  eyebrow?: string;
  title: string;
  description?: string;
}>();
</script>
