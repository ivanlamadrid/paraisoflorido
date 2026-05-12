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

export type PushDiagnostics = {
  isSecureContext: boolean;
  origin: string;
  route: string;
  userId: string | null;
  userRole: string | null;
  notificationPermission: NotificationPermission | 'unsupported';
  hasNotificationApi: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasServiceWorkerController: boolean;
  serviceWorkerControllerScriptUrl: string | null;
  serviceWorkerRegistrationScope: string | null;
  serviceWorkerActiveScriptUrl: string | null;
  serviceWorkerWaitingScriptUrl: string | null;
  serviceWorkerInstallingScriptUrl: string | null;
  serviceWorkerReady: boolean;
  serviceWorkerReadyError: string | null;
  hasPushSubscription: boolean;
  pushSubscriptionEndpointPreview: string | null;
  firebaseMessagingInitialized: boolean;
  fcmTokenPreview: string | null;
  fcmTokenAvailable: boolean;
  storedTokenPreview: string | null;
  storedTokenMatchesCurrent: boolean | null;
  backendRegistrationStatus: string;
};

export type PushDiagnosticsContext = {
  userId?: string | null;
  userRole?: string | null;
  route?: string | null;
};

function canUseBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function maskPushToken(token: string | null | undefined): string | null {
  if (!token) {
    return null;
  }

  if (token.length <= 12) {
    return `${token.slice(0, 3)}...`;
  }

  return `${token.slice(0, 6)}...${token.slice(-4)}`;
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
  const readyRegistration = await Promise.race([
    navigator.serviceWorker.ready,
    timeout<ServiceWorkerRegistration>(SERVICE_WORKER_READY_TIMEOUT_MS),
  ]);

  if (!readyRegistration) {
    throw new Error(
      'No se encontro un service worker activo. Ejecuta la web en modo PWA para activar push.',
    );
  }

  console.info('[PUSH] service worker active:', readyRegistration.active?.scriptURL ?? 'none');
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

  const permission = await Notification.requestPermission();
  console.info('[PUSH] permission', permission);
  return permission;
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

  console.info('[PUSH] FCM token obtained:', maskPushToken(token));
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
  console.info('[PUSH] token registered in backend:', maskPushToken(token));
  return token;
}

export async function getPushDiagnostics(
  context: PushDiagnosticsContext = {},
): Promise<PushDiagnostics> {
  const hasNotificationApi = canUseBrowser() && 'Notification' in window;
  const hasServiceWorker = canUseBrowser() && 'serviceWorker' in navigator;
  const hasPushManager = canUseBrowser() && 'PushManager' in window;
  const notificationPermission = getNotificationPermission();
  const storedToken = readStoredToken();
  let registration: ServiceWorkerRegistration | null = null;
  let readyRegistration: ServiceWorkerRegistration | null = null;
  let serviceWorkerReadyError: string | null = null;
  let pushSubscription: PushSubscription | null = null;
  let fcmToken: string | null = null;

  if (hasServiceWorker) {
    registration = (await navigator.serviceWorker.getRegistration().catch(() => null)) ?? null;
    readyRegistration =
      (await Promise.race([
        navigator.serviceWorker.ready,
        timeout<ServiceWorkerRegistration>(SERVICE_WORKER_READY_TIMEOUT_MS),
      ]).catch((error: unknown) => {
        serviceWorkerReadyError = error instanceof Error ? error.message : String(error);
        return null;
      })) ?? null;

    if (!readyRegistration && !serviceWorkerReadyError) {
      serviceWorkerReadyError = 'navigator.serviceWorker.ready no resolvio a tiempo.';
    }

    const subscriptionRegistration = readyRegistration ?? registration;
    pushSubscription =
      (await subscriptionRegistration?.pushManager.getSubscription().catch(() => null)) ?? null;
  }

  const messaging = await getFirebaseMessaging();
  const vapidKey = getFirebaseVapidKey();
  const firebaseMessagingInitialized = Boolean(messaging);

  if (
    messaging &&
    hasNotificationApi &&
    notificationPermission === 'granted' &&
    readyRegistration &&
    vapidKey
  ) {
    fcmToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: readyRegistration,
    }).catch(() => null);
  }

  const diagnostics: PushDiagnostics = {
    isSecureContext: canUseBrowser() ? window.isSecureContext : false,
    origin: canUseBrowser() ? window.location.origin : '',
    route:
      context.route ?? (canUseBrowser() ? window.location.pathname + window.location.search : ''),
    userId: context.userId ?? null,
    userRole: context.userRole ?? null,
    notificationPermission,
    hasNotificationApi,
    hasServiceWorker,
    hasPushManager,
    hasServiceWorkerController: Boolean(hasServiceWorker && navigator.serviceWorker.controller),
    serviceWorkerControllerScriptUrl:
      hasServiceWorker && navigator.serviceWorker.controller
        ? navigator.serviceWorker.controller.scriptURL
        : null,
    serviceWorkerRegistrationScope: (readyRegistration ?? registration)?.scope ?? null,
    serviceWorkerActiveScriptUrl: (readyRegistration ?? registration)?.active?.scriptURL ?? null,
    serviceWorkerWaitingScriptUrl: (readyRegistration ?? registration)?.waiting?.scriptURL ?? null,
    serviceWorkerInstallingScriptUrl:
      (readyRegistration ?? registration)?.installing?.scriptURL ?? null,
    serviceWorkerReady: Boolean(readyRegistration),
    serviceWorkerReadyError,
    hasPushSubscription: Boolean(pushSubscription),
    pushSubscriptionEndpointPreview: maskPushToken(pushSubscription?.endpoint),
    firebaseMessagingInitialized,
    fcmTokenPreview: maskPushToken(fcmToken),
    fcmTokenAvailable: Boolean(fcmToken),
    storedTokenPreview: maskPushToken(storedToken),
    storedTokenMatchesCurrent: fcmToken ? storedToken === fcmToken : null,
    backendRegistrationStatus:
      fcmToken && storedToken === fcmToken
        ? 'stored_token_matches_current'
        : storedToken
          ? 'stored_token_differs_or_current_unavailable'
          : 'no_stored_token',
  };

  console.info('[PUSH] diagnostics', diagnostics);
  return diagnostics;
}

export async function showSystemNotification(message: ForegroundPushMessage): Promise<boolean> {
  if (!canUseBrowser() || !('Notification' in window) || Notification.permission !== 'granted') {
    console.info('[PUSH] system notification skipped: permission is not granted');
    return false;
  }

  const tag =
    message.data.attendanceRecordId ??
    message.data.notificationId ??
    message.data.type ??
    `${message.title}:${message.body}`;
  const dedupeKey = `${message.data.type ?? 'push'}:${tag}`;

  if (wasSystemNotificationRecentlyShown(dedupeKey)) {
    console.info('[PUSH] system notification deduped:', dedupeKey);
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
      console.info('[PUSH] system notification shown via service worker:', tag);
      return true;
    }
  }

  const notification = new Notification(message.title, options);
  notification.onclick = () => {
    const route = message.data.route ?? '/';
    window.focus();
    window.location.assign(route);
  };

  console.info('[PUSH] system notification shown via Notification API:', tag);
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
    console.info('[PUSH] foreground message received', {
      type: data.type,
      attendanceRecordId: data.attendanceRecordId,
      notificationId: data.notificationId,
    });
    handler({
      title: payload.notification?.title ?? data.title ?? 'Notificacion',
      body: payload.notification?.body ?? data.body ?? '',
      data,
      raw: payload,
    });
  });
}
