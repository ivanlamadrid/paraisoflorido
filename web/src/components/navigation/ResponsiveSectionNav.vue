<template>
  <div
    class="role-section-nav"
    :class="{ 'role-section-nav--compact-tablet': isCompactTablet }"
  >
    <div v-if="showInlineTabs" class="role-section-nav__desktop">
      <q-tabs
        :model-value="modelValue"
        align="left"
        indicator-color="primary"
        active-color="primary"
        class="role-section-nav__tabs"
        no-caps
        outside-arrows
        mobile-arrows
        @update:model-value="emit('update:modelValue', $event)"
      >
        <q-tab
          v-for="item in items"
          :key="item.value"
          :name="item.value"
          :icon="item.icon"
          :label="item.label"
          class="role-section-nav__tab"
        />
      </q-tabs>
    </div>

    <q-page-sticky
      v-if="showBottomNav"
      position="bottom"
      :offset="[0, 10]"
      class="role-section-nav__mobile"
    >
      <div
        class="role-section-nav__bottom"
        role="tablist"
        aria-label="Secciones"
      >
        <q-btn
          v-for="item in items"
          :key="item.value"
          flat
          no-caps
          stack
          class="role-section-nav__bottom-btn"
          :class="{ 'role-section-nav__bottom-btn--active': modelValue === item.value }"
          @click="emit('update:modelValue', item.value)"
        >
          <q-icon :name="item.icon" size="20px" />
          <span>{{ item.label }}</span>
        </q-btn>
      </div>
    </q-page-sticky>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useResponsiveDevice } from 'src/composables/use-responsive-device';

export type SectionNavItem = {
  value: string;
  label: string;
  icon: string;
};

const props = withDefaults(defineProps<{
  modelValue: string;
  items: SectionNavItem[];
  showDesktopTabs?: boolean;
}>(), {
  showDesktopTabs: true,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const { isPhone, isCompactTablet, isDesktop } = useResponsiveDevice();
const showBottomNav = computed(() => {
  if (!props.showDesktopTabs) {
    return !isDesktop.value;
  }

  return isPhone.value || isCompactTablet.value;
});
const showInlineTabs = computed(
  () => !showBottomNav.value && props.showDesktopTabs,
);
</script>
