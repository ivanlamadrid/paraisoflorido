<template>
  <q-card flat bordered class="admin-card">
    <q-card-section class="ui-card-body">
      <div class="ui-eyebrow">Seguridad</div>
      <div class="text-subtitle1 text-weight-bold q-mt-sm">
        {{ title }}
      </div>
      <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
        {{ description }}
      </p>

      <StatusBanner
        v-if="feedback"
        class="q-mt-lg"
        :variant="feedback.type"
        :title="feedback.title"
        :message="feedback.message"
      />

      <q-form class="q-gutter-md q-mt-lg" @submit="handleSubmit">
        <q-input
          v-model="form.currentPassword"
          label="Contraseña actual"
          outlined
          autocomplete="current-password"
          :type="showCurrentPassword ? 'text' : 'password'"
          :rules="[(value) => Boolean(value) || 'Ingresa tu contraseña actual']"
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
          hint="Usa al menos 8 caracteres."
          :rules="[
            (value) => Boolean(value) || 'Ingresa la nueva contraseña',
            (value) => value.length >= 8 || 'La contraseña debe tener al menos 8 caracteres',
            (value) =>
              value !== form.currentPassword || 'La nueva contraseña debe ser distinta de la actual',
          ]"
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
          :rules="[
            (value) => Boolean(value) || 'Confirma la nueva contraseña',
            (value) => value === form.newPassword || 'Las contraseñas no coinciden',
          ]"
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

        <div class="row items-center justify-between q-gutter-md">
          <div class="text-caption text-grey-7">
            Si olvidaste tu contraseña, solicita un restablecimiento presencial a dirección o
            secretaría.
          </div>

          <q-btn
            color="primary"
            :label="submitLabel"
            no-caps
            type="submit"
            :loading="loading"
          />
        </div>
      </q-form>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import StatusBanner from 'components/ui/StatusBanner.vue';
import type { ChangePasswordPayload } from 'src/types/session';

type FeedbackState = {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
};

const props = withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    submitLabel?: string;
    loading?: boolean;
    feedback: FeedbackState | null;
  }>(),
  {
    title: 'Cambiar contraseña',
    description:
      'Actualiza tu acceso con tu contraseña actual y una nueva clave personal.',
    submitLabel: 'Guardar contraseña',
    loading: false,
  },
);

const emit = defineEmits<{
  submit: [payload: ChangePasswordPayload];
}>();

const form = reactive<ChangePasswordPayload>({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const showCurrentPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

function handleSubmit(): void {
  emit('submit', {
    currentPassword: form.currentPassword,
    newPassword: form.newPassword,
    confirmPassword: form.confirmPassword,
  });
}

watch(
  () => props.feedback,
  (feedback) => {
    if (feedback?.type !== 'success') {
      return;
    }

    form.currentPassword = '';
    form.newPassword = '';
    form.confirmPassword = '';
  },
);
</script>
