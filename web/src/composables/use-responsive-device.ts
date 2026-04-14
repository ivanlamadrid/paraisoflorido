import { computed } from 'vue';
import { useQuasar } from 'quasar';

export const PHONE_MAX_WIDTH = 767;
export const COMPACT_TABLET_MIN_WIDTH = 768;
export const COMPACT_TABLET_MAX_WIDTH = 899;
export const TABLET_MAX_WIDTH = 1023;

export function useResponsiveDevice() {
  const $q = useQuasar();

  const screenWidth = computed(() => $q.screen.width);
  const isPhone = computed(() => screenWidth.value <= PHONE_MAX_WIDTH);
  const isCompactTablet = computed(
    () =>
      screenWidth.value >= COMPACT_TABLET_MIN_WIDTH &&
      screenWidth.value <= COMPACT_TABLET_MAX_WIDTH,
  );
  const isTablet = computed(
    () =>
      screenWidth.value >= COMPACT_TABLET_MIN_WIDTH &&
      screenWidth.value <= TABLET_MAX_WIDTH,
  );
  const isDesktop = computed(() => screenWidth.value > TABLET_MAX_WIDTH);

  return {
    screenWidth,
    isPhone,
    isCompactTablet,
    isTablet,
    isDesktop,
  };
}
