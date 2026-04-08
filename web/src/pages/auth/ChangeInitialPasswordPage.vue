<template>
  <q-page class="auth-page">
    <div class="auth-page__stack">
      <q-card flat bordered class="auth-card">
        <q-card-section class="auth-card__top">
          <SchoolMark class="lt-lg q-mb-lg" :show-text="false" />
          <div class="ui-eyebrow">
            {{ isStudentForcedChange ? 'Primer ingreso' : 'Acceso protegido' }}
          </div>
          <div class="ui-page-title q-mt-sm">{{ pageTitle }}</div>
          <p class="ui-page-description q-mt-md q-mb-none">
            {{ pageDescription }}
          </p>

          <div class="row q-gutter-sm q-mt-lg">
            <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="person">
              {{ sessionStore.user?.username }}
            </q-chip>
            <q-chip class="ui-stat-chip" color="red-1" text-color="red-10" icon="shield">
              Cambio obligatorio
            </q-chip>
          </div>

          <div class="auth-card__info-grid q-mt-lg">
            <div class="auth-card__hint">
              {{ primaryHint }}
            </div>

            <div class="auth-card__support">
              <div class="auth-card__support-label">Recomendación</div>
              <div class="auth-card__support-copy">
                Elige una contraseña fácil de recordar para ti y no la compartas.
              </div>
            </div>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-section class="auth-card__body">
          <StatusBanner
            v-if="errorMessage"
            class="q-mb-lg"
            variant="error"
            :message="errorMessage"
          />

          <q-form class="q-gutter-md" @submit="handleSubmit">
            <q-input
              v-model="form.currentPassword"
              ref="currentPasswordInputRef"
              label="Contraseña actual"
              outlined
              autocomplete="current-password"
              :type="showCurrentPassword ? 'text' : 'password'"
              lazy-rules
              :rules="[(value) => Boolean(value) || 'Ingresa tu contraseña actual']"
              @update:model-value="errorMessage = ''"
            >
              <template #prepend>
                <q-icon name="lock_open" />
              </template>
              <template #append>
                <q-btn
                  flat
                  round
                  dense
                  type="button"
                  :icon="showCurrentPassword ? 'visibility_off' : 'visibility'"
                  @click="showCurrentPassword = !showCurrentPassword"
                />
              </template>
            </q-input>

            <q-input
              v-model="form.newPassword"
              label="Nueva contraseña"
              outlined
              autocomplete="new-password"
              :type="showNewPassword ? 'text' : 'password'"
              hint="Debe tener al menos 8 caracteres."
              lazy-rules
              :rules="[
                (value) => Boolean(value) || 'Ingresa tu nueva contraseña',
                (value) => value.length >= 8 || 'La contraseña debe tener al menos 8 caracteres',
                (value) =>
                  value !== form.currentPassword || 'La nueva contraseña debe ser distinta de la actual',
              ]"
              @update:model-value="errorMessage = ''"
            >
              <template #prepend>
                <q-icon name="lock" />
              </template>
              <template #append>
                <q-btn
                  flat
                  round
                  dense
                  type="button"
                  :icon="showNewPassword ? 'visibility_off' : 'visibility'"
                  @click="showNewPassword = !showNewPassword"
                />
              </template>
            </q-input>

            <q-input
              v-model="form.confirmPassword"
              label="Confirmar nueva contraseña"
              outlined
              autocomplete="new-password"
              :type="showConfirmPassword ? 'text' : 'password'"
              lazy-rules
              :rules="[
                (value) => Boolean(value) || 'Confirma tu nueva contraseña',
                (value) => value === form.newPassword || 'Las contraseñas no coinciden',
              ]"
              @update:model-value="errorMessage = ''"
            >
              <template #prepend>
                <q-icon name="verified_user" />
              </template>
              <template #append>
                <q-btn
                  flat
                  round
                  dense
                  type="button"
                  :icon="showConfirmPassword ? 'visibility_off' : 'visibility'"
                  @click="showConfirmPassword = !showConfirmPassword"
                />
              </template>
            </q-input>

            <q-btn
              color="primary"
              label="Guardar nueva contraseña"
              no-caps
              class="full-width"
              :loading="isSubmitting"
              type="submit"
            />
          </q-form>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import SchoolMark from 'components/ui/SchoolMark.vue';
import StatusBanner from 'components/ui/StatusBanner.vue';
import { getApiErrorMessage } from 'src/services/api/api-errors';
import { getDefaultRouteForUser, useSessionStore } from 'src/stores/session-store';

const router = useRouter();
const sessionStore = useSessionStore();
const currentPasswordInputRef = ref<{ focus: () => void } | null>(null);

const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const errorMessage = ref('');
const isSubmitting = ref(false);
const showCurrentPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

const isStudentForcedChange = computed(() => sessionStore.user?.role === 'student');
const pageTitle = computed(() =>
  isStudentForcedChange.value
    ? 'Cambiar contraseña inicial'
    : 'Cambiar contraseña obligatoria',
);
const pageDescription = computed(() =>
  isStudentForcedChange.value
    ? 'Antes de continuar, actualiza tu contraseña para proteger tu acceso personal al sistema.'
    : 'Tu acceso fue restablecido y debes definir una nueva contraseña antes de continuar.',
);
const primaryHint = computed(() =>
  isStudentForcedChange.value
    ? 'Usa una contraseña distinta al código del estudiante y distinta a la contraseña inicial entregada por el colegio.'
    : 'Usa una contraseña nueva, personal y distinta a la contraseña temporal entregada por dirección o secretaría.',
);

async function handleSubmit(): Promise<void> {
  errorMessage.value = '';
  isSubmitting.value = true;

  try {
    const user = isStudentForcedChange.value
      ? await sessionStore.changeStudentInitialPassword(form)
      : await sessionStore.changeOwnPassword(form);

    await router.replace(getDefaultRouteForUser(user));
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error);
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(() => {
  void nextTick(() => {
    currentPasswordInputRef.value?.focus();
  });
});
</script>
