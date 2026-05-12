type ServiceWorkerClientLike = {
  url: string;
  focus: () => Promise<unknown>;
  navigate?: (url: string) => Promise<ServiceWorkerClientLike>;
};

type NotificationClickEventLike = Event & {
  notification: Notification;
  waitUntil: (promise: Promise<unknown>) => void;
};

declare const self: typeof globalThis & {
  __WB_MANIFEST: Array<{ revision: string | null; url: string }>;
  clients: {
    matchAll: (options: {
      type: 'window';
      includeUncontrolled: boolean;
    }) => Promise<ServiceWorkerClientLike[]>;
    openWindow: (url: string) => Promise<unknown>;
  };
  location: Location;
  registration: {
    showNotification: (title: string, options: NotificationOptions) => Promise<void>;
  };
  skipWaiting: () => void;
  addEventListener: (
    type: 'notificationclick',
    listener: (event: NotificationClickEventLike) => void,
  ) => void;
};

import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { clientsClaim } from 'workbox-core';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

type PushNotificationData = Record<string, string>;
const SW_VERSION = 'push-debug-20260512-001';

console.log('[SW] version', SW_VERSION);

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const pwaFallbackHtml =
  typeof process === 'undefined' ? 'index.html' : (process.env.PWA_FALLBACK_HTML ?? 'index.html');
const pwaServiceWorkerRegex =
  typeof process === 'undefined' ? 'sw.js$' : (process.env.PWA_SERVICE_WORKER_REGEX ?? 'sw.js$');

if (process.env.PROD) {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL(pwaFallbackHtml), {
      denylist: [new RegExp(pwaServiceWorkerRegex), /workbox-(.)*\.js$/],
    }),
  );
}

const firebaseConfig = {
  apiKey: typeof process === 'undefined' ? '' : (process.env.VITE_FIREBASE_API_KEY ?? ''),
  authDomain: typeof process === 'undefined' ? '' : (process.env.VITE_FIREBASE_AUTH_DOMAIN ?? ''),
  projectId: typeof process === 'undefined' ? '' : (process.env.VITE_FIREBASE_PROJECT_ID ?? ''),
  storageBucket:
    typeof process === 'undefined' ? '' : (process.env.VITE_FIREBASE_STORAGE_BUCKET ?? ''),
  messagingSenderId:
    typeof process === 'undefined' ? '' : (process.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? ''),
  appId: typeof process === 'undefined' ? '' : (process.env.VITE_FIREBASE_APP_ID ?? ''),
};

if (Object.values(firebaseConfig).every((value) => value.trim().length > 0)) {
  const firebaseApp = initializeApp(firebaseConfig);
  const messaging = getMessaging(firebaseApp);

  onBackgroundMessage(messaging, (payload) => {
    console.log('[SW][PUSH] background message received', {
      type: payload.data?.type,
      attendanceRecordId: payload.data?.attendanceRecordId,
      notificationId: payload.data?.notificationId,
    });
    const data = (payload.data ?? {}) as PushNotificationData;
    const title = payload.notification?.title ?? data.title ?? 'Notificacion';
    const body = payload.notification?.body ?? data.body ?? '';
    const tag = data.attendanceRecordId ?? data.notificationId ?? data.type;

    const options: NotificationOptions = {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/favicon-128x128.png',
      data: {
        ...data,
        route: data.route ?? '/',
      },
    };

    if (tag) {
      options.tag = tag;
    }

    console.log('[SW][PUSH] showing notification', { title, tag, route: data.route ?? '/' });
    void self.registration.showNotification(title, options);
  });
}

self.addEventListener('notificationclick', (event) => {
  console.log('[SW][PUSH] notification click');
  event.notification.close();

  const notificationData = event.notification.data as PushNotificationData | undefined;
  const route = notificationData?.route ?? '/';
  const targetUrl = new URL(route, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then(async (clientList: ServiceWorkerClientLike[]) => {
        for (const client of clientList) {
          if (client.navigate && client.url.startsWith(self.location.origin)) {
            await client.navigate(targetUrl);
            return client.focus();
          }
        }

        return self.clients.openWindow(targetUrl);
      }),
  );
});
