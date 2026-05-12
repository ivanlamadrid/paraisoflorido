import { deleteToken, getToken, onMessage, type MessagePayload } from 'firebase/messaging';
import {
  getFirebaseMessaging,
  getFirebaseVapidKey,
  isFirebaseMessagingSupported,
} from 'boot/firebase';
import {
  registerNotificationToken,
  unregisterNotificationToken,
} from 'src/services/api/notifications-api';

const STORED_FCM_TOKEN_KEY = 'colegio.push.fcm-token';
const SHOWN_SYSTEM_NOTIFICATION_KEY = 'colegio.push.shown-system-notifications';
const SERVICE_WORKER_READY_TIMEOUT_MS = 5000;
const SYSTEM_NOTIFICATION_DEDUPE_TTL_MS = 2 * 60 * 1000;

export type ForegroundPushMessage = {
  title: string;
  body: string;
  data: Record<string, string>;
  raw: MessagePayload;
};

function canUseBrowser(): boolean {
  return typeof window !== 'undefined';
}

function readStoredToken(): string | null {
  if (!canUseBrowser()) {
    return null;
  }

  return window.localStorage.getItem(STORED_FCM_TOKEN_KEY);
}

function persistStoredToken(token: string | null): void {
  if (!canUseBrowser()) {
    return;
  }

  if (!token) {
    window.localStorage.removeItem(STORED_FCM_TOKEN_KEY);
    return;
  }

  window.localStorage.setItem(STORED_FCM_TOKEN_KEY, token);
}

function readShownSystemNotifications(): Record<string, number> {
  if (!canUseBrowser()) {
    return {};
  }

  try {
    return JSON.parse(window.localStorage.getItem(SHOWN_SYSTEM_NOTIFICATION_KEY) ?? '{}') as Record<
      string,
      number
    >;
  } catch {
    return {};
  }
}

function wasSystemNotificationRecentlyShown(key: string): boolean {
  if (!canUseBrowser()) {
    return false;
  }

  const now = Date.now();
  const items = readShownSystemNotifications();
  const recentItems = Object.fromEntries(
    Object.entries(items).filter(
      ([, timestamp]) => now - timestamp < SYSTEM_NOTIFICATION_DEDUPE_TTL_MS,
    ),
  );
  const wasShown = Boolean(recentItems[key]);

  recentItems[key] = now;
  window.localStorage.setItem(SHOWN_SYSTEM_NOTIFICATION_KEY, JSON.stringify(recentItems));

  return wasShown;
}

function timeout<T>(ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(null), ms);
  });
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  const existingRegistration = await navigator.serviceWorker.getRegistration();

  if (existingRegistration) {
    return existingRegistration;
  }

  const readyRegistration = await Promise.race([
    navigator.serviceWorker.ready,
    timeout<ServiceWorkerRegistration>(SERVICE_WORKER_READY_TIMEOUT_MS),
  ]);

  if (!readyRegistration) {
    throw new Error(
      'No se encontro un service worker activo. Ejecuta la web en modo PWA para activar push.',
    );
  }

  return readyRegistration;
}

export async function isPushSupported(): Promise<boolean> {
  if (!canUseBrowser()) {
    return false;
  }

  return (
    'PushManager' in window &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    Boolean(getFirebaseVapidKey()) &&
    (await isFirebaseMessagingSupported())
  );
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!canUseBrowser() || !('Notification' in window)) {
    return 'unsupported';
  }

  return Notification.permission;
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!canUseBrowser() || !('Notification' in window)) {
    return 'denied';
  }

  return Notification.requestPermission();
}

export async function getCurrentFcmToken(): Promise<string> {
  if (!(await isPushSupported())) {
    throw new Error('Este navegador no soporta notificaciones push en esta app.');
  }

  if (Notification.permission !== 'granted') {
    throw new Error('Debes permitir las notificaciones antes de registrar el dispositivo.');
  }

  const messaging = await getFirebaseMessaging();
  const vapidKey = getFirebaseVapidKey();

  if (!messaging || !vapidKey) {
    throw new Error('Firebase no esta configurado para notificaciones push.');
  }

  const serviceWorkerRegistration = await getServiceWorkerRegistration();
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration,
  });

  if (!token) {
    throw new Error('Firebase no devolvio un token para este navegador.');
  }

  return token;
}

export async function registerCurrentDeviceToken(): Promise<string> {
  const token = await getCurrentFcmToken();

  await registerNotificationToken({
    token,
    platform: 'web',
    userAgent: navigator.userAgent,
  });

  persistStoredToken(token);
  return token;
}

export async function showSystemNotification(message: ForegroundPushMessage): Promise<boolean> {
  if (!canUseBrowser() || !('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }

  const tag =
    message.data.attendanceRecordId ??
    message.data.notificationId ??
    message.data.type ??
    `${message.title}:${message.body}`;
  const dedupeKey = `${message.data.type ?? 'push'}:${tag}`;

  if (wasSystemNotificationRecentlyShown(dedupeKey)) {
    return false;
  }

  const options: NotificationOptions = {
    body: message.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/favicon-128x128.png',
    tag,
    data: {
      ...message.data,
      route: message.data.route ?? '/',
    },
  };

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready.catch(() => null);

    if (registration) {
      await registration.showNotification(message.title, options);
      return true;
    }
  }

  const notification = new Notification(message.title, options);
  notification.onclick = () => {
    const route = message.data.route ?? '/';
    window.focus();
    window.location.assign(route);
  };

  return true;
}

export async function unregisterCurrentDeviceToken(): Promise<void> {
  const storedToken = readStoredToken();
  const messaging = await getFirebaseMessaging();

  if (storedToken) {
    await unregisterNotificationToken(storedToken);
    persistStoredToken(null);
  }

  if (messaging) {
    await deleteToken(messaging).catch(() => undefined);
  }
}

export async function setupForegroundMessageListener(
  handler: (message: ForegroundPushMessage) => void,
): Promise<() => void> {
  const messaging = await getFirebaseMessaging();

  if (!messaging) {
    return () => undefined;
  }

  return onMessage(messaging, (payload) => {
    const data = payload.data ?? {};
    handler({
      title: payload.notification?.title ?? data.title ?? 'Notificacion',
      body: payload.notification?.body ?? data.body ?? '',
      data,
      raw: payload,
    });
  });
}
