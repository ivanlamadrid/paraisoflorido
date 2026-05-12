declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
    VUE_ROUTER_MODE: 'hash' | 'history' | 'abstract' | undefined;
    VUE_ROUTER_BASE: string | undefined;
    PROD?: string | boolean;
    PWA_FALLBACK_HTML?: string;
    PWA_SERVICE_WORKER_REGEX?: string;
    VITE_FIREBASE_API_KEY?: string;
    VITE_FIREBASE_AUTH_DOMAIN?: string;
    VITE_FIREBASE_PROJECT_ID?: string;
    VITE_FIREBASE_STORAGE_BUCKET?: string;
    VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
    VITE_FIREBASE_APP_ID?: string;
  }
}

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_VAPID_KEY?: string;
  readonly VITE_ATTENDANCE_EXIT_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
