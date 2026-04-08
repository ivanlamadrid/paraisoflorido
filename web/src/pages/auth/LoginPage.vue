<template>
  <q-page class="auth-page" :style-fn="authPageStyleFn">
    <div class="auth-page__stack">
      <q-card flat bordered class="auth-card auth-card--login">
        <q-card-section class="auth-card__top">
          <div class="ui-eyebrow">Acceso institucional</div>
          <div class="ui-page-title q-mt-sm">Iniciar sesión</div>
          <p class="ui-page-description q-mt-md q-mb-none">
            Ingresa con tu usuario y contraseña para continuar.
          </p>
        </q-card-section>

        <q-separator />

        <q-card-section class="auth-card__body">
          <StatusBanner
            v-if="errorMessage"
            class="q-mb-lg"
            variant="error"
            :message="errorMessage"
          />

          <q-form class="auth-form" @submit="handleSubmit">
            <q-input
              v-model="form.username"
              ref="usernameInputRef"
              label="Usuario"
              outlined
              autocomplete="username"
              maxlength="32"
              lazy-rules
              :rules="[(value) => Boolean(value) || 'Ingresa tu usuario']"
              @update:model-value="errorMessage = ''"
            >
              <template #prepend>
                <q-icon name="badge" />
              </template>
            </q-input>

            <q-input
              v-model="form.password"
              label="Contraseña"
              outlined
              autocomplete="current-password"
              :type="showPassword ? 'text' : 'password'"
              lazy-rules
              :rules="[(value) => Boolean(value) || 'Ingresa tu contraseña']"
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
                  :icon="showPassword ? 'visibility_off' : 'visibility'"
                  @click="showPassword = !showPassword"
                />
              </template>
            </q-input>

            <div class="row q-col-gutter-sm items-center auth-form__actions">
              <div class="col-12 col-sm">
                <q-btn
                  color="primary"
                  label="Ingresar"
                  no-caps
                  class="full-width"
                  :loading="isSubmitting"
                  type="submit"
                />
              </div>
            </div>
          </q-form>

          <div class="auth-login-help q-mt-lg">
            <div class="auth-login-help__label">Ayuda rápida</div>
            <div class="auth-login-help__item">
              Si eres estudiante, tu usuario es tu código personal.
            </div>
            <div class="auth-login-help__item">
              Si olvidaste tu contraseña, solicita apoyo en dirección o secretaría.
            </div>
          </div>
        </q-card-section>
      </q-card>

      <AuthInstitutionPanel class="lt-md q-mt-lg" embedded />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import AuthInstitutionPanel from 'components/auth/AuthInstitutionPanel.vue';
import StatusBanner from 'components/ui/StatusBanner.vue';
import { getApiErrorMessage } from 'src/services/api/api-errors';
import { getDefaultRouteForUser, useSessionStore } from 'src/stores/session-store';

const router = useRouter();
const sessionStore = useSessionStore();
const usernameInputRef = ref<{ focus: () => void } | null>(null);

const form = reactive({
  username: '',
  password: '',
});

const errorMessage = ref('');
const isSubmitting = ref(false);
const showPassword = ref(false);

function authPageStyleFn(): { minHeight: string } {
  return { minHeight: 'auto' };
}

async function handleSubmit(): Promise<void> {
  errorMessage.value = '';
  isSubmitting.value = true;

  try {
    const user = await sessionStore.loginWithCredentials(form);
    await router.replace(getDefaultRouteForUser(user));
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error);
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(() => {
  void nextTick(() => {
    usernameInputRef.value?.focus();
  });
});
</script>
