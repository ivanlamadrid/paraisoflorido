import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { getInstitutionSettings } from 'src/services/api/institution-api';
import type { InstitutionSettings } from 'src/types/institution';

export const useInstitutionStore = defineStore('institution', () => {
  const settings = ref<InstitutionSettings | null>(null);
  const loaded = ref(false);
  const loading = ref(false);

  const schoolName = computed(
    () => settings.value?.schoolName ?? 'Colegio Paraíso Florido 3082',
  );

  async function loadSettings(force = false): Promise<InstitutionSettings | null> {
    if (loaded.value && settings.value && !force) {
      return settings.value;
    }

    loading.value = true;

    try {
      const nextSettings = await getInstitutionSettings();
      settings.value = nextSettings;
      loaded.value = true;
      return nextSettings;
    } finally {
      loading.value = false;
    }
  }

  function applySettings(nextSettings: InstitutionSettings): void {
    settings.value = nextSettings;
    loaded.value = true;
  }

  function reset(): void {
    settings.value = null;
    loaded.value = false;
    loading.value = false;
  }

  return {
    settings,
    loaded,
    loading,
    schoolName,
    loadSettings,
    applySettings,
    reset,
  };
});
