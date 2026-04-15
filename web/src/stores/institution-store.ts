import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  getInstitutionSettingsCached,
  primeInstitutionSettingsCache,
} from 'src/services/api/institution-api';
import type { InstitutionSettings } from 'src/types/institution';

export const useInstitutionStore = defineStore('institution', () => {
  const settings = ref<InstitutionSettings | null>(null);
  const loaded = ref(false);
  const loading = ref(false);
  let loadPromise: Promise<InstitutionSettings | null> | null = null;

  const schoolName = computed(
    () => settings.value?.schoolName ?? 'Colegio Paraíso Florido 3082',
  );

  async function loadSettings(force = false): Promise<InstitutionSettings | null> {
    if (loadPromise) {
      return loadPromise;
    }

    loading.value = true;

    loadPromise = (async () => {
      try {
        const nextSettings = await getInstitutionSettingsCached({
          forceRefresh: force,
        });
        settings.value = nextSettings;
        loaded.value = true;
        return nextSettings;
      } finally {
        loading.value = false;
        loadPromise = null;
      }
    })();

    return loadPromise;
  }

  function applySettings(nextSettings: InstitutionSettings): void {
    settings.value = nextSettings;
    loaded.value = true;
    primeInstitutionSettingsCache(nextSettings);
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
