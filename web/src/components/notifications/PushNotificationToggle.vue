<template>
  <q-btn
    flat
    dense
    no-caps
    :color="buttonColor"
    :icon="buttonIcon"
    :label="compact ? undefined : buttonLabel"
    :loading="isBusy"
    :disable="isDisabled"
    class="push-notification-toggle"
    @click="handleClick"
  >
    <q-tooltip v-if="compact || helperText">
      {{ helperText || buttonLabel }}
    </q-tooltip>
  </q-btn>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import {
  getNotificationPermission,
  isPushSupported,
  registerCurrentDeviceToken,
  requestPushPermission,
  unregisterCurrentDeviceToken,
} from 'src/services/push-notifications';

defineProps<{
  compact?: boolean;
}>();

const $q = useQuasar();
const supported = ref<boolean | null>(null);
const permission = ref<NotificationPermission | 'unsupported'>(getNotificationPermission());
const isRegistered = ref(false);
const isBusy = ref(false);
const lastError = ref<string | null>(null);

const isDisabled = computed(() => supported.value === false || permission.value === 'denied');

const buttonIcon = computed(() => {
  if (supported.value === false) {
    return 'notifications_off';
  }

  if (permission.value === 'denied') {
    return 'block';
  }

  if (isRegistered.value) {
    return 'notifications_active';
  }

  return 'notifications';
});

const buttonColor = computed(() => {
  if (isRegistered.value) {
    return 'positive';
  }

  if (permission.value === 'denied' || supported.value === false) {
    return 'grey-7';
  }

  return 'primary';
});

const buttonLabel = computed(() => {
  if (supported.value === null) {
    return 'Notificaciones';
  }

  if (supported.value === false) {
    return 'No soportado';
  }

  if (permission.value === 'denied') {
    return 'Permiso bloqueado';
  }

  if (isRegistered.value) {
    return 'Notificaciones activadas';
  }

  return 'Activar notificaciones';
});

const helperText = computed(() => {
  if (lastError.value) {
    return lastError.value;
  }

  if (supported.value === false) {
    return 'Este navegador no soporta Web Push o falta configurar Firebase.';
  }

  if (permission.value === 'denied') {
    return 'El permiso esta bloqueado en el navegador o sistema operativo.';
  }

  if (isRegistered.value) {
    return 'Este dispositivo esta registrado para recibir push.';
  }

  return 'Activa las notificaciones desde una accion del usuario.';
});

async function registerDevice(showSuccess = true): Promise<void> {
  isBusy.value = true;
  lastError.value = null;

  try {
    await registerCurrentDeviceToken();
    isRegistered.value = true;
    permission.value = getNotificationPermission();

    if (showSuccess) {
      $q.notify({
        type: 'positive',
        icon: 'notifications_active',
        message: 'Notificaciones activadas en este dispositivo.',
      });
    }
  } catch (error) {
    isRegistered.value = false;
    lastError.value =
      error instanceof Error ? error.message : 'No se pudo registrar este dispositivo.';

    if (showSuccess) {
      $q.notify({
        type: 'warning',
        icon: 'notifications_off',
        message: lastError.value,
        multiLine: true,
      });
    }
  } finally {
    isBusy.value = false;
  }
}

async function handleClick(): Promise<void> {
  if (supported.value === false || permission.value === 'denied') {
    return;
  }

  if (isRegistered.value) {
    isBusy.value = true;

    try {
      await unregisterCurrentDeviceToken();
      isRegistered.value = false;
      $q.notify({
        type: 'info',
        icon: 'notifications_off',
        message: 'Notificaciones desactivadas en este dispositivo.',
      });
    } catch (error) {
      lastError.value =
        error instanceof Error ? error.message : 'No se pudo desactivar este dispositivo.';
      $q.notify({
        type: 'warning',
        icon: 'notifications_off',
        message: lastError.value,
        multiLine: true,
      });
    } finally {
      isBusy.value = false;
    }

    return;
  }

  if (permission.value !== 'granted') {
    permission.value = await requestPushPermission();

    if (permission.value === 'denied') {
      $q.notify({
        type: 'warning',
        icon: 'block',
        message:
          'El navegador bloqueo las notificaciones. Puedes cambiarlo en la configuracion del sitio.',
        multiLine: true,
      });
      return;
    }

    if (permission.value !== 'granted') {
      return;
    }
  }

  await registerDevice();
}

onMounted(async () => {
  supported.value = await isPushSupported();
  permission.value = getNotificationPermission();

  if (supported.value && permission.value === 'granted') {
    await registerDevice(false);
  }
});
</script>
