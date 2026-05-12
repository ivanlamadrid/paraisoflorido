import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { getNotifications, markNotificationAsRead } from 'src/services/api/notifications-api';
import type { AppNotification } from 'src/types/notifications';

export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref<AppNotification[]>([]);
  const isLoading = ref(false);

  const unreadCount = computed(() => items.value.filter((item) => item.readAt === null).length);

  async function refresh(): Promise<void> {
    isLoading.value = true;

    try {
      items.value = await getNotifications();
    } finally {
      isLoading.value = false;
    }
  }

  async function markRead(notificationId: string): Promise<void> {
    const response = await markNotificationAsRead(notificationId);
    const notification = items.value.find((item) => item.id === notificationId);

    if (notification) {
      notification.readAt = response.readAt;
    }
  }

  function reset(): void {
    items.value = [];
    isLoading.value = false;
  }

  return {
    items,
    isLoading,
    unreadCount,
    refresh,
    markRead,
    reset,
  };
});
