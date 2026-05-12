import {
  getWebPushDebugInfo,
  registerWebPushSubscription as registerWebPushSubscriptionApi,
  unregisterWebPushSubscription as unregisterWebPushSubscriptionApi,
} from 'src/services/api/notifications-api';
import type { WebPushDebugResponse } from 'src/types/notifications';

const SERVICE_WORKER_READY_TIMEOUT_MS = 5000;
const STORED_WEB_PUSH_ENDPOINT_KEY = 'colegio.web-push.endpoint';

export type WebPushDiagnosticsContext = {
  userId?: string | null;
  userRole?: string | null;
  route?: string | null;
};

export type NotificationTestResult = {
  ok: boolean;
  permission: NotificationPermission | 'unsupported';
  message: string;
  error: string | null;
};

export type WebPushDiagnostics = {
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
  serviceWorkerRegistrationScope: string | null;
  serviceWorkerActiveScriptUrl: string | null;
  serviceWorkerWaitingScriptUrl: string | null;
  serviceWorkerInstallingScriptUrl: string | null;
  serviceWorkerReady: boolean;
  serviceWorkerReadyError: string | null;
  pushSubscriptionExists: boolean;
  pushSubscriptionEndpointPreview: string | null;
  pushSubscriptionUsesConfiguredVapidKey: boolean | null;
  webPushPublicKeyConfigured: boolean;
  storedEndpointPreview: string | null;
  backend: WebPushDebugResponse | null;
  backendError: string | null;
};

function canUseBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function isWebPushSupported(): boolean {
  return (
    canUseBrowser() &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    Boolean(getConfiguredPublicKey())
  );
}

export function getWebPushPermission(): NotificationPermission | 'unsupported' {
  if (!canUseBrowser() || !('Notification' in window)) {
    return 'unsupported';
  }

  return Notification.permission;
}

export async function requestWebPushPermission(): Promise<NotificationPermission> {
  if (!canUseBrowser() || !('Notification' in window)) {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  console.info('[PUSH-LOCAL] Notification permission =', permission);
  return permission;
}

export async function testLocalNotification(): Promise<NotificationTestResult> {
  const permission = await ensureNotificationPermission();

  if (permission !== 'granted') {
    return {
      ok: false,
      permission,
      message:
        'El navegador o el sistema no mostró la notificación local. Revisa permisos del sitio/app, notificaciones del navegador y configuración del celular.',
      error: permission === 'denied' ? 'permission_denied' : 'permission_not_granted',
    };
  }

  try {
    new Notification('Prueba local', {
      body: 'Si ves esto, el celular puede mostrar notificaciones reales.',
      icon: '/icons/icon-192x192.png',
    });
    console.info('[PUSH-LOCAL] new Notification success');

    return {
      ok: true,
      permission,
      message: 'La notificación local fue solicitada correctamente.',
      error: null,
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.warn('[PUSH-LOCAL] new Notification fail', errorMessage);

    return {
      ok: false,
      permission,
      message:
        'El navegador o el sistema no mostró la notificación local. Revisa permisos del sitio/app, notificaciones del navegador y configuración del celular.',
      error: errorMessage,
    };
  }
}

export async function testServiceWorkerNotification(): Promise<NotificationTestResult> {
  const permission = await ensureNotificationPermission();

  if (permission !== 'granted') {
    return {
      ok: false,
      permission,
      message:
        'No se puede probar el service worker porque el permiso de notificaciones no está concedido.',
      error: permission === 'denied' ? 'permission_denied' : 'permission_not_granted',
    };
  }

  try {
    const registration = await getReadyServiceWorkerRegistration();
    console.info('[PUSH-LOCAL] service worker ready', registration.active?.scriptURL ?? 'none');
    await registration.showNotification('Prueba Service Worker', {
      body: 'Si ves esto, el service worker puede mostrar notificaciones reales.',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/favicon-128x128.png',
      tag: 'local-sw-test',
      data: { route: '/mi-asistencia' },
    });
    console.info('[PUSH-LOCAL] showNotification success');

    return {
      ok: true,
      permission,
      message: 'El service worker solicitó la notificación correctamente.',
      error: null,
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.warn('[PUSH-LOCAL] showNotification fail', errorMessage);

    return {
      ok: false,
      permission,
      message:
        'No se pudo mostrar la notificación desde el service worker. Revisa que la app esté en modo PWA y que el service worker esté activo.',
      error: errorMessage,
    };
  }
}

export async function getWebPushSubscription(): Promise<PushSubscription | null> {
  if (!canUseBrowser() || !('serviceWorker' in navigator)) {
    return null;
  }

  const registration = await getReadyServiceWorkerRegistration();
  return registration.pushManager.getSubscription();
}

export async function registerWebPushSubscription(): Promise<PushSubscription> {
  if (!isWebPushSupported()) {
    throw new Error('Este navegador no soporta Web Push o falta configurar VITE_WEB_PUSH_PUBLIC_KEY.');
  }

  const permission = await ensureNotificationPermission();

  if (permission !== 'granted') {
    throw new Error('Debes permitir las notificaciones antes de registrar este dispositivo.');
  }

  const registration = await getReadyServiceWorkerRegistration();
  const publicKey = getConfiguredPublicKey();

  if (!publicKey) {
    throw new Error('Falta configurar VITE_WEB_PUSH_PUBLIC_KEY.');
  }

  let subscription = await registration.pushManager.getSubscription();

  if (subscription && !subscriptionUsesConfiguredVapidKey(subscription, publicKey)) {
    console.info('[WEB-PUSH] existing subscription uses a different VAPID key; recreating');
    await subscription.unsubscribe();
    subscription = null;
  }

  subscription ??= await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToArrayBuffer(publicKey),
  });

  const payload = buildBackendPayload(subscription);

  await registerWebPushSubscriptionApi({
    ...payload,
    userAgent: navigator.userAgent,
  });

  persistStoredEndpoint(subscription.endpoint);
  console.info('[WEB-PUSH] subscription registered in backend', {
    endpoint: maskEndpoint(subscription.endpoint),
  });

  return subscription;
}

export async function unregisterWebPushSubscription(): Promise<void> {
  const subscription = await getWebPushSubscription();
  const storedEndpoint = readStoredEndpoint();
  const endpoint = subscription?.endpoint ?? storedEndpoint;

  if (endpoint) {
    await unregisterWebPushSubscriptionApi(endpoint);
  }

  if (subscription) {
    await subscription.unsubscribe();
  }

  persistStoredEndpoint(null);
}

export async function getWebPushDiagnostics(
  context: WebPushDiagnosticsContext = {},
): Promise<WebPushDiagnostics> {
  const hasNotificationApi = canUseBrowser() && 'Notification' in window;
  const hasServiceWorker = canUseBrowser() && 'serviceWorker' in navigator;
  const hasPushManager = canUseBrowser() && 'PushManager' in window;
  const publicKey = getConfiguredPublicKey();
  let registration: ServiceWorkerRegistration | null = null;
  let serviceWorkerReadyError: string | null = null;
  let subscription: PushSubscription | null = null;
  let backend: WebPushDebugResponse | null = null;
  let backendError: string | null = null;

  if (hasServiceWorker) {
    registration =
      (await Promise.race([
        navigator.serviceWorker.ready,
        timeout<ServiceWorkerRegistration>(SERVICE_WORKER_READY_TIMEOUT_MS),
      ]).catch((error: unknown) => {
        serviceWorkerReadyError = getErrorMessage(error);
        return null;
      })) ?? null;

    if (!registration && !serviceWorkerReadyError) {
      serviceWorkerReadyError = 'navigator.serviceWorker.ready no resolvió a tiempo.';
    }

    subscription = (await registration?.pushManager.getSubscription().catch(() => null)) ?? null;
  }

  try {
    backend = await getWebPushDebugInfo();
  } catch (error) {
    backendError = getErrorMessage(error);
  }

  const diagnostics: WebPushDiagnostics = {
    isSecureContext: canUseBrowser() ? window.isSecureContext : false,
    origin: canUseBrowser() ? window.location.origin : '',
    route:
      context.route ?? (canUseBrowser() ? window.location.pathname + window.location.search : ''),
    userId: context.userId ?? null,
    userRole: context.userRole ?? null,
    notificationPermission: getWebPushPermission(),
    hasNotificationApi,
    hasServiceWorker,
    hasPushManager,
    hasServiceWorkerController: Boolean(hasServiceWorker && navigator.serviceWorker.controller),
    serviceWorkerRegistrationScope: registration?.scope ?? null,
    serviceWorkerActiveScriptUrl: registration?.active?.scriptURL ?? null,
    serviceWorkerWaitingScriptUrl: registration?.waiting?.scriptURL ?? null,
    serviceWorkerInstallingScriptUrl: registration?.installing?.scriptURL ?? null,
    serviceWorkerReady: Boolean(registration),
    serviceWorkerReadyError,
    pushSubscriptionExists: Boolean(subscription),
    pushSubscriptionEndpointPreview: maskEndpoint(subscription?.endpoint),
    pushSubscriptionUsesConfiguredVapidKey:
      subscription && publicKey ? subscriptionUsesConfiguredVapidKey(subscription, publicKey) : null,
    webPushPublicKeyConfigured: Boolean(publicKey),
    storedEndpointPreview: maskEndpoint(readStoredEndpoint()),
    backend,
    backendError,
  };

  console.info('[WEB-PUSH] diagnostics', diagnostics);
  return diagnostics;
}

async function ensureNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  const permission = getWebPushPermission();

  if (permission === 'default') {
    return requestWebPushPermission();
  }

  return permission;
}

async function getReadyServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (!canUseBrowser() || !('serviceWorker' in navigator)) {
    throw new Error('Este navegador no tiene service worker disponible.');
  }

  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    timeout<ServiceWorkerRegistration>(SERVICE_WORKER_READY_TIMEOUT_MS),
  ]);

  if (!registration) {
    throw new Error('No se encontró un service worker activo para la PWA.');
  }

  return registration;
}

function buildBackendPayload(subscription: PushSubscription): {
  endpoint: string;
  keys: { p256dh: string; auth: string };
} {
  const subscriptionJson = subscription.toJSON();
  const p256dh = subscriptionJson.keys?.p256dh;
  const auth = subscriptionJson.keys?.auth;

  if (!subscription.endpoint || !p256dh || !auth) {
    throw new Error('La suscripción Push API no devolvió llaves completas.');
  }

  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh,
      auth,
    },
  };
}

function getConfiguredPublicKey(): string | null {
  const value = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY?.trim();

  if (!value || value === 'REEMPLAZAR_AQUI') {
    return null;
  }

  return value;
}

function subscriptionUsesConfiguredVapidKey(
  subscription: PushSubscription,
  publicKey: string,
): boolean {
  const key = subscription.options?.applicationServerKey;
  const currentPublicKey = arrayBufferToBase64Url(key);

  if (!currentPublicKey) {
    return false;
  }

  return normalizeBase64Url(currentPublicKey) === normalizeBase64Url(publicKey);
}

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray.buffer;
}

function arrayBufferToBase64Url(
  value: ArrayBuffer | ArrayBufferView | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const bytes =
    value instanceof ArrayBuffer
      ? new Uint8Array(value)
      : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function normalizeBase64Url(value: string): string {
  return value.trim().replace(/=+$/g, '');
}

function readStoredEndpoint(): string | null {
  if (!canUseBrowser()) {
    return null;
  }

  return window.localStorage.getItem(STORED_WEB_PUSH_ENDPOINT_KEY);
}

function persistStoredEndpoint(endpoint: string | null): void {
  if (!canUseBrowser()) {
    return;
  }

  if (!endpoint) {
    window.localStorage.removeItem(STORED_WEB_PUSH_ENDPOINT_KEY);
    return;
  }

  window.localStorage.setItem(STORED_WEB_PUSH_ENDPOINT_KEY, endpoint);
}

function maskEndpoint(endpoint: string | null | undefined): string | null {
  if (!endpoint) {
    return null;
  }

  if (endpoint.length <= 18) {
    return `${endpoint.slice(0, 8)}...`;
  }

  return `${endpoint.slice(0, 12)}...${endpoint.slice(-8)}`;
}

function timeout<T>(ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(null), ms);
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : 'Error desconocido.';
}
