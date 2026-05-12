<template>
  <q-page class="notifications-page">
    <div class="app-page app-page--narrow">
      <div class="page-header q-mb-lg">
        <div>
          <div class="ui-eyebrow">Cuenta</div>
          <h1>Notificaciones</h1>
          <p>Mensajes internos guardados por el sistema y estado de push del dispositivo.</p>
        </div>
        <div class="notifications-page__actions">
          <PushNotificationToggle />
          <q-btn
            outline
            color="primary"
            icon="send"
            label="Probar"
            no-caps
            :loading="isSendingTest"
            @click="handleSendTest"
          />
        </div>
      </div>

      <div v-if="feedback" class="q-mb-md">
        <q-banner rounded :class="`bg-${feedback.color}-1 text-${feedback.color}-10`">
          {{ feedback.message }}
        </q-banner>
      </div>

      <div v-if="notificationsStore.isLoading" class="ui-loading-state q-py-xl">
        <q-spinner color="primary" size="32px" />
        <div>Cargando notificaciones...</div>
      </div>

      <div v-else-if="notificationsStore.items.length === 0" class="notifications-page__empty">
        <q-icon name="notifications_none" size="34px" color="grey-6" />
        <div class="text-subtitle1 text-weight-bold">Sin notificaciones</div>
        <p>Aqui apareceran las notificaciones internas del sistema.</p>
      </div>

      <q-list v-else bordered separator class="notifications-page__list">
        <q-item
          v-for="item in notificationsStore.items"
          :key="item.id"
          class="notifications-page__item"
          :class="{ 'notifications-page__item--unread': !item.readAt }"
        >
          <q-item-section avatar>
            <q-avatar :color="getNotificationTone(item.type).color" text-color="white">
              <q-icon :name="getNotificationTone(item.type).icon" />
            </q-avatar>
          </q-item-section>

          <q-item-section>
            <q-item-label class="text-weight-bold">{{ item.title }}</q-item-label>
            <q-item-label caption>{{ item.body }}</q-item-label>
            <q-item-label caption>
              {{ formatNotificationDate(item.createdAt) }}
            </q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-btn
              v-if="!item.readAt"
              flat
              dense
              color="primary"
              icon="done"
              label="Leida"
              no-caps
              @click="handleMarkRead(item.id)"
            />
            <q-chip v-else dense color="grey-2" text-color="grey-8"> Leida </q-chip>
          </q-item-section>
        </q-item>
      </q-list>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PushNotificationToggle from 'components/notifications/PushNotificationToggle.vue';
import { sendTestNotification } from 'src/services/api/notifications-api';
import { useNotificationsStore } from 'src/stores/notifications-store';
import type { AppNotificationType } from 'src/types/notifications';

const notificationsStore = useNotificationsStore();
const isSendingTest = ref(false);
const feedback = ref<{ color: 'green' | 'orange' | 'red'; message: string } | null>(null);

function getNotificationTone(type: AppNotificationType): {
  color: string;
  icon: string;
} {
  if (type === 'attendance_marked' || type === 'attendance_entry_marked') {
    return { color: 'green-7', icon: 'fact_check' };
  }

  if (type === 'announcement_published') {
    return { color: 'blue-7', icon: 'campaign' };
  }

  return { color: 'primary', icon: 'notifications' };
}

function formatNotificationDate(value: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

async function handleMarkRead(notificationId: string): Promise<void> {
  await notificationsStore.markRead(notificationId);
}

async function handleSendTest(): Promise<void> {
  isSendingTest.value = true;
  feedback.value = null;

  try {
    const response = await sendTestNotification();
    await notificationsStore.refresh();

    feedback.value = {
      color: response.delivery.sent > 0 ? 'green' : 'orange',
      message:
        response.delivery.sent > 0
          ? 'Se envio una notificacion push de prueba a este usuario.'
          : 'La prueba quedo registrada, pero no hay dispositivos push activos o Firebase no esta configurado.',
    };
  } catch (error) {
    feedback.value = {
      color: 'red',
      message:
        error instanceof Error ? error.message : 'No se pudo enviar la notificacion de prueba.',
    };
  } finally {
    isSendingTest.value = false;
  }
}

onMounted(() => {
  void notificationsStore.refresh();
});
</script>

<style scoped>
.notifications-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.notifications-page__empty {
  align-items: center;
  border: 1px dashed rgba(0, 0, 0, 0.16);
  border-radius: 8px;
  color: #5f6368;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 40px 16px;
  text-align: center;
}

.notifications-page__empty p {
  margin: 0;
}

.notifications-page__list {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.notifications-page__item--unread {
  background: #f7fbff;
}
</style>
