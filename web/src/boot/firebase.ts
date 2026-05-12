import { boot } from 'quasar/wrappers';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging';

type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

let messagingSupportPromise: Promise<boolean> | null = null;
let messagingInstance: Messaging | null = null;

function getFirebaseConfig(): FirebaseWebConfig | null {
  const config: FirebaseWebConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
  };

  return Object.values(config).every((value) => value.trim().length > 0) ? config : null;
}

export function getFirebaseVapidKey(): string | null {
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? '';

  return vapidKey.trim() || null;
}

export function getFirebaseApp(): FirebaseApp | null {
  const config = getFirebaseConfig();

  if (!config) {
    return null;
  }

  return getApps().length > 0 ? getApp() : initializeApp(config);
}

export async function isFirebaseMessagingSupported(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return false;
  }

  messagingSupportPromise ??= isSupported().catch(() => false);
  return messagingSupportPromise;
}

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (messagingInstance) {
    return messagingInstance;
  }

  const app = getFirebaseApp();

  if (!app || !(await isFirebaseMessagingSupported())) {
    return null;
  }

  messagingInstance = getMessaging(app);
  return messagingInstance;
}

export default boot(() => {
  getFirebaseApp();
});
